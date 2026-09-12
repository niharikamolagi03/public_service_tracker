from django.db import models
from django.conf import settings
import uuid
import random
import string

class ServiceCategory(models.Model):
    name = models.CharField(max_length=100)
    name_hi = models.CharField(max_length=100, blank=True)
    icon = models.CharField(max_length=50, default='FaFileAlt')
    description = models.TextField()
    estimated_days = models.IntegerField(default=7)
    is_active = models.BooleanField(default=True)
    # Comma-separated list of required document type keys, e.g. "aadhar,photo,residence"
    required_documents = models.CharField(max_length=255, blank=True, default='')

    def get_required_documents(self):
        if not self.required_documents:
            return []
        return [d.strip() for d in self.required_documents.split(',') if d.strip()]

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Service Categories"

class ServiceRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('under_review', 'Under Review'),
        ('document_verification', 'Document Verification'),
        ('in_progress', 'In Progress'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
        ('delayed', 'Delayed'),
    ]
    
    PRIORITY_CHOICES = [
        ('normal', 'Normal'),
        ('urgent', 'Urgent'),
        ('emergency', 'Emergency'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tracking_id = models.CharField(max_length=20, unique=True, editable=False)
    citizen = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='requests')
    category = models.ForeignKey(ServiceCategory, on_delete=models.CASCADE)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='pending')
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    submitted_date = models.DateTimeField(auto_now_add=True)
    expected_completion = models.DateTimeField(null=True, blank=True)
    completed_date = models.DateTimeField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    assigned_officer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_requests')
    
    predicted_delay_days = models.IntegerField(default=0)
    delay_reason = models.TextField(blank=True)
    ai_confidence = models.FloatField(default=0.0)
    
    qr_code = models.ImageField(upload_to='qrcodes/', blank=True)
    
    def save(self, *args, **kwargs):
        if not self.tracking_id:
            self.tracking_id = self.generate_tracking_id()
        super().save(*args, **kwargs)
    
    def generate_tracking_id(self):
        prefix = self.category.name[:3].upper() if self.category else 'SRV'
        numbers = ''.join(random.choices(string.digits, k=8))
        return f"{prefix}{numbers}"
    
    def __str__(self):
        return f"{self.tracking_id} - {self.citizen.username}"

class Document(models.Model):
    DOCUMENT_TYPES = [
        ('aadhar', 'Aadhar Card'),
        ('pan', 'PAN Card'),
        ('income', 'Income Certificate'),
        ('residence', 'Residence Proof'),
        ('photo', 'Photograph'),
        ('signature', 'Signature'),
    ]
    
    service_request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    file = models.FileField(upload_to='documents/%Y/%m/%d/')
    verification_status = models.CharField(max_length=20, default='pending')
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.service_request.tracking_id} - {self.document_type}"

class ActivityLog(models.Model):
    service_request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=100)
    description = models.TextField()
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    department = models.CharField(max_length=100)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.service_request.tracking_id} - {self.action}"