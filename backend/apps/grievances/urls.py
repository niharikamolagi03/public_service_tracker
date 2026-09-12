from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GrievanceViewSet

router = DefaultRouter()
router.register(r'grievances', GrievanceViewSet, basename='grievances')

urlpatterns = [path('', include(router.urls))]
