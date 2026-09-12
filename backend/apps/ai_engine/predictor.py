from datetime import datetime, timedelta
from django.utils import timezone

class DelayPredictor:
    def predict_delay(self, service_request):
        days_passed = (timezone.now() - service_request.submitted_date).days
        estimated_days = service_request.category.estimated_days
        
        # Priority adjustment
        priority_multiplier = {
            'normal': 1,
            'urgent': 0.7,
            'emergency': 0.5
        }
        
        adjusted_estimated = estimated_days * priority_multiplier.get(service_request.priority, 1)
        is_delayed = days_passed > adjusted_estimated + 5
        delay_days = max(0, days_passed - adjusted_estimated)
        
        reasons = []
        if not service_request.assigned_officer:
            reasons.append("Officer not assigned yet")
        
        pending_docs = service_request.documents.filter(verification_status='pending').count()
        if pending_docs > 0:
            reasons.append(f"Pending document verification ({pending_docs} documents)")
        
        if service_request.priority == 'normal' and delay_days > 10:
            reasons.append("High workload in department")
        
        reason = " | ".join(reasons) if reasons else "Processing taking longer than expected"
        
        return {
            'is_delayed': is_delayed,
            'delay_days': int(delay_days),
            'reason': reason,
            'confidence': 0.85
        }