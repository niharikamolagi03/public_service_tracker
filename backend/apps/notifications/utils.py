def send_notification(user, title, message, notification_type='info', grievance_id=''):
    from apps.notifications.models import Notification
    Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
        grievance_id=grievance_id or '',
    )
