from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuthViewSet, NotificationViewSet
from .chat import chat_view

router = DefaultRouter()
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'notifications', NotificationViewSet, basename='notifications')

urlpatterns = [
    path('', include(router.urls)),
    path('', include('apps.grievances.urls')),
    path('chat/', chat_view, name='chat'),
]
