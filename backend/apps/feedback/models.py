from django.db import models
from django.conf import settings
from apps.services.models import ServiceRequest

class Feedback(models.Model):
    service_request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE, related_name='feedbacks')
    citizen = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='feedbacks')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comments = models.TextField()
    would_recommend = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['service_request', 'citizen']
    
    def __str__(self):
        return f"{self.service_request.tracking_id} - Rating: {self.rating}"