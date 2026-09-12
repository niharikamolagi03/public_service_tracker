from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

DEPARTMENT_CHOICES = [
    ('electricity', 'Electricity Board'),
    ('water', 'Water Resources'),
    ('road', 'Road & Infrastructure'),
    ('garbage', 'Garbage Services'),
    ('streetlight', 'Streetlight Maintenance'),
    ('sewage', 'Sewage & Drainage'),
    ('park', 'Parks & Public Spaces'),
    ('noise', 'Noise Control'),
    ('encroachment', 'Encroachment Control'),
    ('police', 'Police Department'),
    ('transport', 'Transport Department'),
    ('health', 'Health Department'),
    ('municipal', 'Municipal Corporation'),
    ('other', 'Other'),
]

class User(AbstractUser):
    ROLE_CHOICES = [
        ('citizen', 'Citizen'),
        ('officer', 'Government Officer'),
        ('admin', 'Administrator'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='citizen')
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    preferred_language = models.CharField(max_length=10, default='en')
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    address = models.TextField(blank=True)
    pincode = models.CharField(max_length=6, blank=True)
    department = models.CharField(max_length=50, blank=True, null=True, choices=DEPARTMENT_CHOICES)
    employee_id = models.CharField(max_length=50, blank=True, null=True, unique=True)
    is_verified = models.BooleanField(default=False)
    is_pending_verification = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.username


class OfficerApplication(models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='officer_application')
    employee_id = models.CharField(max_length=50)
    department = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES)
    official_email = models.EmailField()
    id_card = models.FileField(upload_to='officer_ids/%Y/%m/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_applications')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} — {self.department} ({self.status})"
