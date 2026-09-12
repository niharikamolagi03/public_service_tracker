from apps.services.models import ServiceCategory

class ServiceRecommender:
    def __init__(self, user):
        self.user = user
    
    def get_recommendations(self):
        recommendations = []
        
        # Get user's past requests
        past_requests = self.user.requests.all()
        
        if past_requests.exists():
            # Find most used category
            from django.db.models import Count
            category_usage = past_requests.values('category').annotate(count=Count('id')).order_by('-count')
            
            if category_usage:
                most_used_category_id = category_usage[0]['category']
                most_used_category = ServiceCategory.objects.get(id=most_used_category_id)
                
                # Recommend related services
                related_categories = ServiceCategory.objects.exclude(id=most_used_category_id).filter(is_active=True)[:3]
                
                for category in related_categories:
                    recommendations.append({
                        'service': {'name': category.name, 'id': category.id},
                        'reason': f"Based on your interest in {most_used_category.name}",
                        'confidence': 0.75
                    })
        
        return recommendations