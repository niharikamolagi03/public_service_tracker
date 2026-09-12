from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.notifications.models import Notification
from apps.accounts.models import OfficerApplication

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone_number', 'role', 'first_name', 'last_name',
                  'preferred_language', 'profile_picture', 'department', 'address', 'pincode',
                  'is_verified', 'is_pending_verification', 'created_at']
        read_only_fields = ['id', 'role', 'is_verified', 'is_pending_verification', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'phone_number', 'first_name', 'last_name']

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            phone_number=validated_data.get('phone_number', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role='citizen',
            is_verified=True,
        )


class OfficerApplicationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    user_id = serializers.CharField(source='user.id', read_only=True)

    class Meta:
        model = OfficerApplication
        fields = ['id', 'user_id', 'username', 'email', 'employee_id', 'department',
                  'official_email', 'id_card', 'status', 'rejection_reason', 'submitted_at']
        read_only_fields = ['status', 'rejection_reason', 'submitted_at']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'notification_type', 'is_read', 'grievance_id', 'created_at']
