from rest_framework import serializers
from .models import (
    Grievance, GrievanceMedia, GrievanceUpdate,
    GrievanceComment, GrievanceFollow, GrievanceFeedback,
)


class GrievanceMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = GrievanceMedia
        fields = ['id', 'file', 'file_url', 'media_type', 'caption', 'uploaded_at']

    def get_file_url(self, obj):
        return f'http://localhost:8000{obj.file.url}' if obj.file else None


class GrievanceUpdateSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source='performed_by.username', read_only=True)
    performed_by_role = serializers.CharField(source='performed_by.role', read_only=True)

    class Meta:
        model = GrievanceUpdate
        fields = ['id', 'old_status', 'new_status', 'message', 'is_public', 'timestamp',
                  'performed_by_name', 'performed_by_role']


class GrievanceCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_role = serializers.CharField(source='author.role', read_only=True)

    class Meta:
        model = GrievanceComment
        fields = ['id', 'text', 'is_official', 'created_at', 'author_name', 'author_role']


class GrievanceFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrievanceFeedback
        fields = ['id', 'rating', 'comments', 'resolution_satisfactory', 'created_at']
        read_only_fields = ['created_at']


class GrievanceListSerializer(serializers.ModelSerializer):
    citizen_name = serializers.CharField(source='citizen.username', read_only=True)
    citizen_phone = serializers.CharField(source='citizen.phone_number', read_only=True)
    officer_name = serializers.CharField(source='assigned_officer.username', read_only=True, default=None)
    media_count = serializers.SerializerMethodField()
    follower_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    has_feedback = serializers.SerializerMethodField()
    first_image = serializers.SerializerMethodField()
    qr_code_url = serializers.SerializerMethodField()

    class Meta:
        model = Grievance
        fields = [
            'id', 'grievance_id', 'title', 'category', 'department', 'priority',
            'status', 'address', 'pincode', 'submitted_at', 'updated_at',
            'citizen_name', 'citizen_phone', 'officer_name', 'upvotes', 'views', 'ai_confidence',
            'ai_category', 'media_count', 'follower_count', 'is_following',
            'expected_resolution', 'resolved_at', 'has_feedback',
            'first_image', 'qr_code_url',
        ]

    def get_media_count(self, obj):
        return obj.media.count()

    def get_follower_count(self, obj):
        return obj.followers.count()

    def get_is_following(self, obj):
        req = self.context.get('request')
        if req and req.user.is_authenticated:
            return obj.followers.filter(user=req.user).exists()
        return False

    def get_has_feedback(self, obj):
        return hasattr(obj, 'feedback')

    def get_first_image(self, obj):
        img = obj.media.filter(media_type='image').first()
        if img and img.file:
            return f'http://localhost:8000{img.file.url}'
        return None

    def get_qr_code_url(self, obj):
        if obj.qr_code:
            return f'http://localhost:8000{obj.qr_code.url}'
        return None


class GrievanceDetailSerializer(serializers.ModelSerializer):
    citizen_name = serializers.CharField(source='citizen.username', read_only=True)
    citizen_phone = serializers.CharField(source='citizen.phone_number', read_only=True)
    officer_name = serializers.CharField(source='assigned_officer.username', read_only=True, default=None)
    media = GrievanceMediaSerializer(many=True, read_only=True)
    updates = GrievanceUpdateSerializer(many=True, read_only=True)
    comments = GrievanceCommentSerializer(many=True, read_only=True)
    feedback = GrievanceFeedbackSerializer(read_only=True)
    follower_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    has_feedback = serializers.SerializerMethodField()
    qr_code_url = serializers.SerializerMethodField()

    class Meta:
        model = Grievance
        fields = [
            'id', 'grievance_id', 'title', 'description', 'category', 'department',
            'priority', 'status', 'address', 'pincode', 'latitude', 'longitude',
            'ai_category', 'ai_department', 'ai_priority', 'ai_confidence',
            'resolution_notes', 'rejection_reason', 'expected_resolution', 'resolved_at',
            'upvotes', 'views', 'is_public', 'submitted_at', 'updated_at',
            'citizen_name', 'citizen_phone', 'officer_name',
            'media', 'updates', 'comments', 'feedback',
            'follower_count', 'is_following', 'has_feedback', 'qr_code_url',
        ]

    def get_follower_count(self, obj):
        return obj.followers.count()

    def get_is_following(self, obj):
        req = self.context.get('request')
        if req and req.user.is_authenticated:
            return obj.followers.filter(user=req.user).exists()
        return False

    def get_has_feedback(self, obj):
        return hasattr(obj, 'feedback')

    def get_qr_code_url(self, obj):
        if obj.qr_code:
            return f'http://localhost:8000{obj.qr_code.url}'
        return None
