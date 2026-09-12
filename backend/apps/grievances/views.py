from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg, Q
from django.utils import timezone

from .models import (
    Grievance, GrievanceMedia, GrievanceUpdate,
    GrievanceComment, GrievanceFollow, GrievanceFeedback,
)
from .serializers import (
    GrievanceListSerializer, GrievanceDetailSerializer,
    GrievanceUpdateSerializer, GrievanceCommentSerializer,
    GrievanceFeedbackSerializer,
)
from .ai_router import classify_grievance
from apps.notifications.utils import send_notification
from django.contrib.auth import get_user_model

User = get_user_model()


class GrievanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return GrievanceDetailSerializer
        return GrievanceListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Grievance.objects.select_related('citizen', 'assigned_officer').prefetch_related(
            'media', 'updates', 'comments', 'followers'
        )

        # Mapping: which categories belong to which officer department
        DEPT_CATEGORIES = {
            'electricity': ['electricity', 'streetlight'],
            'water':       ['water', 'sewage'],
            'municipal':   ['road', 'garbage', 'park', 'encroachment', 'municipal'],
            'police':      ['noise', 'police'],
            'transport':   ['transport'],
            'health':      ['health'],
            'other':       ['other'],
        }

        if user.role in ['admin', 'officer']:
            if user.role == 'officer' and user.department:
                dept = user.department.strip().lower()
                # Categories this officer's department handles
                handled_cats = DEPT_CATEGORIES.get(dept, [dept])
                # Officer sees: complaints assigned to them OR routed to their dept/categories
                qs = qs.filter(
                    Q(assigned_officer=user) |
                    Q(department=dept) |
                    Q(category__in=handled_cats)
                )

            # Apply query param filters
            dept_param = self.request.query_params.get('department')
            cat_param  = self.request.query_params.get('category')
            st_param   = self.request.query_params.get('status')
            pri_param  = self.request.query_params.get('priority')
            search     = self.request.query_params.get('search', '')

            if dept_param:
                handled = DEPT_CATEGORIES.get(dept_param, [dept_param])
                qs = qs.filter(Q(department=dept_param) | Q(category__in=handled))
            if cat_param:
                qs = qs.filter(category=cat_param)
            if st_param:
                qs = qs.filter(status=st_param)
            if pri_param:
                qs = qs.filter(priority=pri_param)
            if search:
                qs = qs.filter(
                    Q(grievance_id__icontains=search) | Q(title__icontains=search) |
                    Q(citizen__username__icontains=search) | Q(address__icontains=search)
                )
            return qs.order_by('-submitted_at')

        # Citizens see only their own complaints
        return qs.filter(citizen=user).order_by('-submitted_at')

    def create(self, request):
        data = request.data
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()

        # Auto-classify from image filename if title is minimal
        image_file = request.FILES.get('media_0')
        if image_file and (not title or len(title) < 5):
            from .ai_router import classify_from_image_hint
            ai = classify_from_image_hint(image_file.name, image_file.content_type)
        elif title or description:
            ai = classify_grievance(title or description, description or title)
        else:
            return Response({'error': 'Title or image is required'}, status=400)

        if not title:
            title = f"{ai['category'].title()} issue reported"
        if not description:
            description = title

        # Always use the canonical department from DEPARTMENT_MAP (never store category as dept)
        from .ai_router import DEPARTMENT_MAP
        category = data.get('category') or ai['category']
        department = DEPARTMENT_MAP.get(category, 'other')
        priority = data.get('priority') or ai['priority']

        # Find officer in the canonical department
        DEPT_CATEGORIES = {
            'electricity': ['electricity', 'streetlight'],
            'water':       ['water', 'sewage'],
            'municipal':   ['road', 'garbage', 'park', 'encroachment', 'municipal'],
            'police':      ['noise', 'police'],
            'transport':   ['transport'],
            'health':      ['health'],
            'other':       ['other'],
        }
        matching_officers = User.objects.filter(
            role='officer', department=department, is_verified=True
        ).order_by('date_joined')
        assigned_officer = matching_officers.first()
        initial_status = 'under_review' if assigned_officer else 'filed'

        grievance = Grievance.objects.create(
            citizen=request.user, title=title, description=description,
            category=category, department=department, priority=priority,
            status=initial_status, assigned_officer=assigned_officer,
            address=data.get('address', ''), pincode=data.get('pincode', ''),
            latitude=data.get('latitude') or None,
            longitude=data.get('longitude') or None,
            ai_category=ai['category'], ai_department=ai['department'],
            ai_priority=ai['priority'], ai_confidence=ai['confidence'],
        )

        for key, file in request.FILES.items():
            if key.startswith('media_'):
                mtype = 'video' if file.content_type.startswith('video') else (
                    'document' if file.content_type == 'application/pdf' else 'image'
                )
                GrievanceMedia.objects.create(grievance=grievance, file=file, media_type=mtype)

        status_label = 'under review' if assigned_officer else 'pending review'
        assignment_message = (
            f'Grievance auto-assigned to officer {assigned_officer.username}.'
            if assigned_officer else
            f'Grievance routed to {department} department and waiting for officer assignment.'
        )
        GrievanceUpdate.objects.create(
            grievance=grievance, performed_by=request.user,
            new_status=initial_status,
            message=f'Grievance created and {status_label}. AI routed to {department} department (confidence: {round(ai["confidence"]*100)}%). {assignment_message}',
        )
        GrievanceFollow.objects.get_or_create(grievance=grievance, user=request.user)

        if assigned_officer:
            send_notification(assigned_officer, f'New {category.title()} Complaint',
                f'Complaint {grievance.grievance_id} has been assigned to you for review.', 'assigned', grievance.grievance_id)
        elif matching_officers.exists():
            for officer in matching_officers[:5]:
                send_notification(officer, f'New {category.title()} Complaint',
                    f'Complaint {grievance.grievance_id} has been routed to your department.', 'filed', grievance.grievance_id)

        return Response(GrievanceDetailSerializer(grievance, context={'request': request}).data, status=201)

    def retrieve(self, request, pk=None):
        try:
            g = Grievance.objects.get(grievance_id=pk)
        except Grievance.DoesNotExist:
            try:
                g = Grievance.objects.get(pk=pk)
            except Grievance.DoesNotExist:
                return Response({'error': 'Not found'}, status=404)
        g.views += 1
        g.save(update_fields=['views'])
        return Response(GrievanceDetailSerializer(g, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        if request.user.role not in ['admin', 'officer']:
            return Response({'error': 'Permission denied'}, status=403)
        try:
            g = Grievance.objects.get(grievance_id=pk)
        except Grievance.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': 'status required'}, status=400)

        old_status = g.status
        g.status = new_status
        if request.data.get('resolution_notes'):
            g.resolution_notes = request.data['resolution_notes']
        if request.data.get('rejection_reason'):
            g.rejection_reason = request.data['rejection_reason']
        if new_status in ['resolved', 'completed']:
            g.resolved_at = timezone.now()
        if request.data.get('expected_resolution'):
            from django.utils.dateparse import parse_datetime
            val = request.data['expected_resolution']
            parsed = parse_datetime(val + ':00' if len(val) == 16 else val)
            if parsed:
                g.expected_resolution = parsed
        g.save()

        GrievanceUpdate.objects.create(
            grievance=g, performed_by=request.user,
            old_status=old_status, new_status=new_status,
            message=request.data.get('message', f'Status updated to {new_status}'),
        )

        notif_map = {
            'pending': ('Complaint Pending', f'Your complaint {g.grievance_id} is pending review.', 'pending'),
            'under_review': ('Under Review', f'Your complaint {g.grievance_id} is under review by an officer.', 'in_progress'),
            'approved': ('Complaint Approved', f'Your complaint {g.grievance_id} has been approved and is being processed.', 'approved'),
            'completed': ('Complaint Completed', f'Your complaint {g.grievance_id} has been completed successfully.', 'resolved'),
            'assigned': ('Grievance Assigned', f'Your grievance {g.grievance_id} has been assigned to an officer.', 'assigned'),
            'investigating': ('Under Investigation', f'Your grievance {g.grievance_id} is under investigation.', 'in_progress'),
            'in_progress': ('Work In Progress', f'Work has started on grievance {g.grievance_id}.', 'in_progress'),
            'resolved': ('Grievance Resolved ✓', f'Your grievance {g.grievance_id} has been resolved. Please rate your experience.', 'resolved'),
            'rejected': ('Grievance Rejected', f'Grievance {g.grievance_id} was rejected. Reason: {g.rejection_reason}', 'rejected'),
            'escalated': ('Grievance Escalated', f'Grievance {g.grievance_id} has been escalated for priority attention.', 'escalated'),
            'closed': ('Grievance Closed', f'Grievance {g.grievance_id} has been closed.', 'resolved'),
        }
        if new_status in notif_map:
            t, m, nt = notif_map[new_status]
            send_notification(g.citizen, t, m, nt, g.grievance_id)
            for f in g.followers.exclude(user=g.citizen):
                send_notification(f.user, t, f'Update on followed grievance: {m}', nt, g.grievance_id)

        return Response(GrievanceDetailSerializer(g, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def assign_officer(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Permission denied'}, status=403)
        try:
            g = Grievance.objects.get(grievance_id=pk)
        except Grievance.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        officer_id = request.data.get('officer_id')
        try:
            officer = User.objects.get(id=officer_id, role__in=['officer', 'admin'])
        except User.DoesNotExist:
            return Response({'error': 'Officer not found'}, status=404)

        g.assigned_officer = officer
        if g.status in ['filed', 'pending']:
            g.status = 'under_review'
        g.save()
        GrievanceUpdate.objects.create(grievance=g, performed_by=request.user,
            new_status=g.status, message=f'Assigned to officer: {officer.username}')
        send_notification(officer, 'Grievance Assigned to You',
            f'Grievance {g.grievance_id} has been assigned to you.', 'assigned', g.grievance_id)
        send_notification(g.citizen, 'Grievance Assigned',
            f'Your grievance {g.grievance_id} has been assigned to an officer.', 'assigned', g.grievance_id)
        return Response(GrievanceDetailSerializer(g, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        try:
            g = Grievance.objects.get(grievance_id=pk)
        except Grievance.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': 'Comment text required'}, status=400)
        comment = GrievanceComment.objects.create(
            grievance=g, author=request.user, text=text,
            is_official=request.user.role in ['officer', 'admin'],
        )
        if request.user.role in ['officer', 'admin'] and request.user != g.citizen:
            send_notification(g.citizen, 'New Official Comment',
                f'An officer commented on your grievance {g.grievance_id}.', 'comment', g.grievance_id)
        return Response(GrievanceCommentSerializer(comment).data, status=201)

    @action(detail=True, methods=['post'])
    def toggle_follow(self, request, pk=None):
        try:
            g = Grievance.objects.get(grievance_id=pk)
        except Grievance.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        follow, created = GrievanceFollow.objects.get_or_create(grievance=g, user=request.user)
        if not created:
            follow.delete()
            return Response({'following': False})
        return Response({'following': True})

    @action(detail=True, methods=['post'])
    def upvote(self, request, pk=None):
        try:
            g = Grievance.objects.get(grievance_id=pk)
        except Grievance.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        g.upvotes += 1
        g.save(update_fields=['upvotes'])
        return Response({'upvotes': g.upvotes})

    @action(detail=True, methods=['post'])
    def submit_feedback(self, request, pk=None):
        try:
            g = Grievance.objects.get(grievance_id=pk)
        except Grievance.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        if g.citizen != request.user:
            return Response({'error': 'Only the grievance owner can submit feedback'}, status=403)
        if g.status not in ['resolved', 'closed']:
            return Response({'error': 'Feedback only allowed after resolution'}, status=400)
        if hasattr(g, 'feedback'):
            return Response({'error': 'Feedback already submitted'}, status=400)
        fb = GrievanceFeedback.objects.create(
            grievance=g, citizen=request.user,
            rating=request.data.get('rating', 3),
            comments=request.data.get('comments', ''),
            resolution_satisfactory=request.data.get('resolution_satisfactory', True),
        )
        return Response(GrievanceFeedbackSerializer(fb).data, status=201)

    @action(detail=False, methods=['post'])
    def ai_classify(self, request):
        result = classify_grievance(request.data.get('title', ''), request.data.get('description', ''))
        return Response(result)

    @action(detail=False, methods=['get'])
    def my_followed(self, request):
        ids = GrievanceFollow.objects.filter(user=request.user).values_list('grievance_id', flat=True)
        qs = Grievance.objects.filter(id__in=ids).order_by('-updated_at')
        return Response(GrievanceListSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        user = request.user
        DEPT_CATEGORIES = {
            'electricity': ['electricity', 'streetlight'],
            'water':       ['water', 'sewage'],
            'municipal':   ['road', 'garbage', 'park', 'encroachment', 'municipal'],
            'police':      ['noise', 'police'],
            'transport':   ['transport'],
            'health':      ['health'],
            'other':       ['other'],
        }
        if user.role in ['admin', 'officer']:
            if user.role == 'officer' and user.department:
                dept = user.department.strip().lower()
                handled_cats = DEPT_CATEGORIES.get(dept, [dept])
                qs = Grievance.objects.filter(
                    Q(assigned_officer=user) |
                    Q(department=dept) |
                    Q(category__in=handled_cats)
                )
            else:
                qs = Grievance.objects.all()
        else:
            qs = Grievance.objects.filter(citizen=user)

        today = timezone.now().date()
        resolved_qs = qs.filter(status__in=['resolved', 'completed'], resolved_at__isnull=False)
        avg_days = None
        if resolved_qs.exists():
            durations = [(g.resolved_at - g.submitted_at).days for g in resolved_qs if g.resolved_at]
            if durations:
                avg_days = round(sum(durations) / len(durations), 1)

        recent = qs.order_by('-submitted_at')[:6]
        return Response({
            'total': qs.count(),
            'filed': qs.filter(status__in=['filed', 'pending']).count(),
            'in_progress': qs.filter(status__in=['assigned', 'investigating', 'in_progress', 'under_review']).count(),
            'resolved': qs.filter(status__in=['resolved', 'approved']).count(),
            'completed': qs.filter(status__in=['completed', 'closed']).count(),
            'rejected': qs.filter(status='rejected').count(),
            'escalated': qs.filter(status='escalated').count(),
            'today': qs.filter(submitted_at__date=today).count(),
            'avg_resolution_days': avg_days,
            'by_category': list(qs.values('category').annotate(count=Count('id')).order_by('-count')),
            'by_department': list(qs.values('department').annotate(count=Count('id')).order_by('-count')),
            'by_priority': list(qs.values('priority').annotate(count=Count('id'))),
            'by_status': list(qs.values('status').annotate(count=Count('id'))),
            'recent': GrievanceListSerializer(recent, many=True, context={'request': request}).data,
        })

    @action(detail=False, methods=['get'])
    def officers_list(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Permission denied'}, status=403)
        from apps.api.serializers import UserSerializer
        officers = User.objects.filter(role__in=['officer', 'admin'], is_verified=True)
        return Response(UserSerializer(officers, many=True).data)

    @action(detail=False, methods=['get'])
    def new_since(self, request):
        """
        Returns complaints submitted after `since` (ISO timestamp).
        Officers/admins use this to detect new complaints in real-time.
        """
        user = request.user
        if user.role not in ['admin', 'officer']:
            return Response({'error': 'Permission denied'}, status=403)

        since_str = request.query_params.get('since')
        if not since_str:
            return Response({'error': 'since parameter required'}, status=400)

        from django.utils.dateparse import parse_datetime
        since = parse_datetime(since_str)
        if not since:
            return Response({'error': 'Invalid since timestamp'}, status=400)

        DEPT_CATEGORIES = {
            'electricity': ['electricity', 'streetlight'],
            'water':       ['water', 'sewage'],
            'municipal':   ['road', 'garbage', 'park', 'encroachment', 'municipal'],
            'police':      ['noise', 'police'],
            'transport':   ['transport'],
            'health':      ['health'],
            'other':       ['other'],
        }

        if user.role == 'officer' and user.department:
            dept = user.department.strip().lower()
            handled_cats = DEPT_CATEGORIES.get(dept, [dept])
            qs = Grievance.objects.filter(
                Q(assigned_officer=user) | Q(department=dept) | Q(category__in=handled_cats),
                submitted_at__gt=since,
            )
        else:
            qs = Grievance.objects.filter(submitted_at__gt=since)

        new_complaints = qs.order_by('-submitted_at')
        return Response({
            'count': new_complaints.count(),
            'complaints': GrievanceListSerializer(new_complaints[:10], many=True, context={'request': request}).data,
        })
