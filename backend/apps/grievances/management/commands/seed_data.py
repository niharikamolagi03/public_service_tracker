"""
Management command: python3 manage.py seed_data
Creates demo admin, officer, and citizen accounts with sample grievances.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.grievances.models import Grievance, GrievanceUpdate, GrievanceFollow
from apps.grievances.ai_router import classify_grievance

User = get_user_model()

SAMPLE_GRIEVANCES = [
    ('Streetlight not working on MG Road', 'The streetlight near MG Road junction has been non-functional for 3 weeks. It is very dark at night and unsafe for pedestrians.', 'streetlight', 'electricity', 'high'),
    ('Pothole on NH-48 causing accidents', 'There is a large pothole on NH-48 near the flyover. Two accidents have already occurred. Needs immediate repair.', 'road', 'municipal', 'critical'),
    ('No water supply for 5 days', 'Our area has not received water supply for the past 5 days. Residents are suffering greatly. Please restore supply immediately.', 'water', 'water', 'critical'),
    ('Garbage not collected for 2 weeks', 'Garbage has not been collected from our colony for 2 weeks. It is causing health hazards and foul smell.', 'garbage', 'municipal', 'high'),
    ('Power outage in Sector 12', 'There has been a power outage in Sector 12 for the past 8 hours. Transformer seems to have failed.', 'electricity', 'electricity', 'high'),
    ('Sewage overflow on Main Street', 'Sewage is overflowing on Main Street near the market. It is creating unhygienic conditions.', 'sewage', 'water', 'critical'),
    ('Broken park bench in Central Park', 'Several benches in Central Park are broken and pose a safety risk to children and elderly visitors.', 'park', 'municipal', 'medium'),
    ('Loud music disturbance at night', 'A nearby venue plays loud music past midnight regularly, disturbing residents sleep.', 'noise', 'police', 'medium'),
]


class Command(BaseCommand):
    help = 'Seed demo data for the civic grievance platform'

    def handle(self, *args, **kwargs):
        # Admin
        admin, _ = User.objects.get_or_create(
            username='admin',
            defaults=dict(email='admin@civic.gov.in', role='admin', is_verified=True,
                          first_name='Admin', last_name='User', is_staff=True, is_superuser=True)
        )
        admin.set_password('admin123')
        admin.save()
        self.stdout.write(self.style.SUCCESS('✓ Admin: admin / admin123'))

        # Officers per department
        officer_data = [
            ('officer_elec', 'electricity', 'Electricity Board'),
            ('officer_water', 'water', 'Water Resources'),
            ('officer_road', 'road', 'Road & Infrastructure'),
            ('officer_garbage', 'garbage', 'Garbage Services'),
            ('officer_streetlight', 'streetlight', 'Streetlight Maintenance'),
            ('officer_sewage', 'sewage', 'Sewage & Drainage'),
            ('officer_muni', 'municipal', 'Municipal Corporation'),
            ('officer_police', 'police', 'Police Department'),
        ]
        officers = {}
        for uname, dept, _ in officer_data:
            o, _ = User.objects.get_or_create(
                username=uname,
                defaults=dict(email=f'{uname}@civic.gov.in', role='officer', department=dept,
                              is_verified=True, first_name=uname.split('_')[1].title(), last_name='Officer',
                              employee_id=f'EMP-{uname.upper()}')
            )
            o.set_password('officer123')
            o.save()
            officers[dept] = o
        self.stdout.write(self.style.SUCCESS('✓ Officers created (password: officer123)'))

        # Citizen
        citizen, _ = User.objects.get_or_create(
            username='citizen1',
            defaults=dict(email='citizen@example.com', role='citizen', is_verified=True,
                          first_name='Rahul', last_name='Sharma', phone_number='9876543210')
        )
        citizen.set_password('citizen123')
        citizen.save()
        self.stdout.write(self.style.SUCCESS('✓ Citizen: citizen1 / citizen123'))

        # Sample grievances
        statuses = ['filed', 'assigned', 'investigating', 'in_progress', 'resolved', 'filed', 'assigned', 'in_progress']
        for i, (title, desc, cat, dept, pri) in enumerate(SAMPLE_GRIEVANCES):
            if Grievance.objects.filter(title=title).exists():
                continue
            g = Grievance.objects.create(
                citizen=citizen, title=title, description=desc,
                category=cat, department=dept, priority=pri,
                status=statuses[i], address=f'Sample Address {i+1}, City',
                pincode='560001', ai_category=cat, ai_department=dept,
                ai_priority=pri, ai_confidence=0.85,
            )
            officer = officers.get(dept)
            if officer and statuses[i] != 'filed':
                g.assigned_officer = officer
                g.save()
            GrievanceUpdate.objects.create(
                grievance=g, performed_by=citizen, new_status='filed',
                message='Grievance filed by citizen.'
            )
            if statuses[i] == 'resolved':
                from django.utils import timezone
                g.resolved_at = timezone.now()
                g.resolution_notes = 'Issue has been resolved by the concerned department.'
                g.save()
                GrievanceUpdate.objects.create(
                    grievance=g, performed_by=officer or admin, new_status='resolved',
                    message='Issue resolved. Work completed successfully.'
                )
            GrievanceFollow.objects.get_or_create(grievance=g, user=citizen)

        self.stdout.write(self.style.SUCCESS(f'✓ {len(SAMPLE_GRIEVANCES)} sample grievances created'))
        self.stdout.write(self.style.SUCCESS('\n🎉 Seed complete! Run: python3 manage.py runserver'))
