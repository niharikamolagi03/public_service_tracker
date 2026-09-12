from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone

from apps.notifications.models import Notification
from apps.accounts.models import OfficerApplication
from apps.notifications.utils import send_notification
from .serializers import UserSerializer, RegisterSerializer, OfficerApplicationSerializer, NotificationSerializer

User = get_user_model()


class AuthViewSet(viewsets.GenericViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            if user.is_pending_verification and not user.is_verified:
                return Response(
                    {'error': 'Your account is pending admin verification.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def register_officer(self, request):
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')
        phone_number = request.data.get('phone_number', '').strip()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        employee_id = request.data.get('employee_id', '').strip()
        department = request.data.get('department', '').strip()
        official_email = request.data.get('official_email', '').strip()
        id_card = request.FILES.get('id_card')

        errors = {}
        if not username: errors['username'] = 'Required'
        if not email: errors['email'] = 'Required'
        if not password: errors['password'] = 'Required'
        if not employee_id: errors['employee_id'] = 'Required'
        if not department: errors['department'] = 'Required'
        if not official_email: errors['official_email'] = 'Required'
        if not id_card: errors['id_card'] = 'Government ID card is required'
        if User.objects.filter(username=username).exists(): errors['username'] = 'Username already taken'
        if phone_number and User.objects.filter(phone_number=phone_number).exists():
            errors['phone_number'] = 'Phone number already registered'
        if User.objects.filter(employee_id=employee_id).exists(): errors['employee_id'] = 'Employee ID already registered'
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username, email=email, password=password,
            phone_number=phone_number or None, first_name=first_name, last_name=last_name,
            role='officer', department=department, employee_id=employee_id,
            is_verified=False, is_pending_verification=True, is_active=True,
        )
        OfficerApplication.objects.create(
            user=user, employee_id=employee_id, department=department,
            official_email=official_email, id_card=id_card,
        )
        for admin in User.objects.filter(role='admin'):
            send_notification(admin, 'New Officer Verification Request',
                f'{username} applied for officer access ({department}).', 'info')
        return Response({'message': 'Registration submitted. Pending admin verification.', 'status': 'pending'},
                        status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def pending_officers(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Permission denied'}, status=403)
        apps = OfficerApplication.objects.filter(status='pending').select_related('user')
        return Response(OfficerApplicationSerializer(apps, many=True).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def review_officer(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Permission denied'}, status=403)
        app_id = request.data.get('application_id')
        decision = request.data.get('decision')
        reason = request.data.get('reason', '')
        try:
            app = OfficerApplication.objects.get(id=app_id)
        except OfficerApplication.DoesNotExist:
            return Response({'error': 'Application not found'}, status=404)
        app.status = decision
        app.rejection_reason = reason
        app.reviewed_by = request.user
        app.reviewed_at = timezone.now()
        app.save()
        user = app.user
        if decision == 'approved':
            user.is_verified = True
            user.is_pending_verification = False
            user.save()
            send_notification(user, 'Account Approved',
                'Your officer account has been approved. You can now log in.', 'resolved')
        else:
            user.is_pending_verification = False
            user.is_active = False
            user.save()
            send_notification(user, 'Account Rejected',
                f'Your officer registration was rejected. Reason: {reason}', 'rejected')
        return Response({'message': f'Application {decision}'})


class NotificationViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def list_notifications(self, request):
        notifs = Notification.objects.filter(user=request.user)[:30]
        return Response(NotificationSerializer(notifs, many=True).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All marked as read'})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        try:
            n = Notification.objects.get(pk=pk, user=request.user)
            n.is_read = True
            n.save()
        except Notification.DoesNotExist:
            pass
        return Response({'message': 'Marked as read'})
