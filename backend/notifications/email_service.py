from django.core.mail import send_mail
from django.conf import settings


def send_email_notification(
    subject,
    message,
    recipient
):
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@careconnect.app')
    send_mail(
        subject,
        message,
        from_email,
        [recipient],
        fail_silently=False
    )