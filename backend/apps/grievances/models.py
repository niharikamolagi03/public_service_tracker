from django.db import models
from django.conf import settings
import uuid, random, string

CATEGORY_CHOICES = [
    ('electricity', 'Electricity'),
    ('water', 'Water Supply'),
    ('road', 'Road & Infrastructure'),
    ('garbage', 'Garbage Collection'),
    ('streetlight', 'Streetlight'),
    ('sewage', 'Sewage & Drainage'),
    ('park', 'Parks & Public Spaces'),
    ('noise', 'Noise Pollution'),
    ('encroachment', 'Encroachment'),
    ('public_safety', 'Public Safety'),
    ('other', 'Other'),
]

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

STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('under_review', 'Under Review'),
    ('approved', 'Approved'),
    ('completed', 'Completed'),
    ('rejected', 'Rejected'),
    ('escalated', 'Escalated'),
    ('filed', 'Filed'),
    ('assigned', 'Assigned'),
    ('investigating', 'Under Investigation'),
    ('in_progress', 'In Progress'),
    ('resolved', 'Resolved'),
    ('closed', 'Closed'),
]

PRIORITY_CHOICES = [
    ('low', 'Low'),
    ('medium', 'Medium'),
    ('high', 'High'),
    ('critical', 'Critical'),
]


class Grievance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    grievance_id = models.CharField(max_length=25, unique=True, editable=False)
    citizen = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='grievances')
    assigned_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_grievances'
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='other')
    department = models.CharField(max_length=30, choices=DEPARTMENT_CHOICES, default='other')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    address = models.TextField(blank=True)
    pincode = models.CharField(max_length=6, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    # AI fields
    ai_category = models.CharField(max_length=30, blank=True)
    ai_department = models.CharField(max_length=30, blank=True)
    ai_priority = models.CharField(max_length=10, blank=True)
    ai_confidence = models.FloatField(default=0.0)
    # Resolution
    resolution_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    expected_resolution = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    # Engagement
    upvotes = models.IntegerField(default=0)
    views = models.IntegerField(default=0)
    is_public = models.BooleanField(default=True)
    # QR Code
    qr_code = models.ImageField(upload_to='qrcodes/', blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-submitted_at']

    def save(self, *args, **kwargs):
        if not self.grievance_id:
            prefix = self.category[:3].upper() if self.category else 'GRV'
            nums = ''.join(random.choices(string.digits, k=8))
            self.grievance_id = f"GRV-{prefix}-{nums}"
        super().save(*args, **kwargs)
        # Generate QR code after first save (when grievance_id exists)
        if not self.qr_code:
            self._generate_qr()

    def _generate_qr(self):
        try:
            import qrcode
            from io import BytesIO
            from django.core.files.base import ContentFile
            qr = qrcode.QRCode(version=1, box_size=8, border=2)
            qr.add_data(f"http://localhost:3000/track/{self.grievance_id}")
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            buf = BytesIO()
            img.save(buf, format='PNG')
            self.qr_code.save(f"qr_{self.grievance_id}.png", ContentFile(buf.getvalue()), save=True)
        except Exception:
            pass

    def __str__(self):
        return f"{self.grievance_id} — {self.title}"


class GrievanceMedia(models.Model):
    MEDIA_TYPES = [('image', 'Image'), ('video', 'Video'), ('document', 'Document')]
    grievance = models.ForeignKey(Grievance, on_delete=models.CASCADE, related_name='media')
    file = models.FileField(upload_to='grievances/%Y/%m/%d/')
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPES, default='image')
    caption = models.CharField(max_length=200, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)


class GrievanceUpdate(models.Model):
    grievance = models.ForeignKey(Grievance, on_delete=models.CASCADE, related_name='updates')
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    old_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20, blank=True)
    message = models.TextField()
    is_public = models.BooleanField(default=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']


class GrievanceComment(models.Model):
    grievance = models.ForeignKey(Grievance, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.TextField()
    is_official = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class GrievanceFollow(models.Model):
    grievance = models.ForeignKey(Grievance, on_delete=models.CASCADE, related_name='followers')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='followed_grievances')
    followed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['grievance', 'user']


class GrievanceFeedback(models.Model):
    grievance = models.OneToOneField(Grievance, on_delete=models.CASCADE, related_name='feedback')
    citizen = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comments = models.TextField(blank=True)
    resolution_satisfactory = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
