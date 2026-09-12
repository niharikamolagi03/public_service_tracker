from django.contrib import admin
from .models import ServiceCategory, ServiceRequest, Document, ActivityLog

@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'estimated_days', 'is_active')
    list_filter = ('is_active',)

@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = ('tracking_id', 'citizen', 'category', 'status', 'priority', 'submitted_date')
    list_filter = ('status', 'priority', 'category')
    search_fields = ('tracking_id', 'citizen__username', 'title')
    readonly_fields = ('tracking_id', 'submitted_date', 'qr_code')

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('service_request', 'document_type', 'verification_status', 'uploaded_at')
    list_filter = ('document_type', 'verification_status')

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('service_request', 'action', 'department', 'timestamp')
    list_filter = ('action', 'department')