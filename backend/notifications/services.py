from django.core.mail import send_mail
from django.conf import settings

from .models import (
    InAppNotification,
    NotificationDeliveryLog,
)


from .push import send_push_notification as send_fcm_push
from .models import DeviceToken


def send_push_notification(user, title, message, related_sos_id=None):
    tokens = DeviceToken.objects.filter(user=user).values_list('token', flat=True)

    if not tokens:
        print(f"[PUSH SKIPPED] No device token for {user.email}")
        NotificationDeliveryLog.objects.create(
            recipient=user, channel="push", status="failed",
            related_sos_id=related_sos_id, error_message="No device token"
        )
        return

    for token in tokens:
        try:
            send_fcm_push(token, title, message)
            NotificationDeliveryLog.objects.create(
                recipient=user, channel="push", status="sent", related_sos_id=related_sos_id
            )
        except Exception as e:
            NotificationDeliveryLog.objects.create(
                recipient=user, channel="push", status="failed",
                related_sos_id=related_sos_id, error_message=str(e)
            )


# ---------------------------------------------------
# SMS NOTIFICATION (MOCK)
# ---------------------------------------------------

def send_sms_notification(
    user,
    message,
    related_sos_id=None
):
    """
    Twilio / MSG91 integration yahan hoga.
    """

    try:
        print(
            f"[MOCK SMS] To: {user.phone_number} | "
            f"Message: {message}"
        )

        NotificationDeliveryLog.objects.create(
            recipient=user,
            channel="sms",
            status="sent",
            related_sos_id=related_sos_id
        )

    except Exception as e:
        NotificationDeliveryLog.objects.create(
            recipient=user,
            channel="sms",
            status="failed",
            related_sos_id=related_sos_id,
            error_message=str(e)
        )


# ---------------------------------------------------
# EMAIL NOTIFICATION
# ---------------------------------------------------

def send_email_notification(
    user,
    subject,
    message,
    related_sos_id=None
):
    """
    SMTP Email Sender
    """

    try:
        if not user.email:
            raise Exception("User email missing")

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        NotificationDeliveryLog.objects.create(
            recipient=user,
            channel="email",
            status="sent",
            related_sos_id=related_sos_id
        )

    except Exception as e:
        NotificationDeliveryLog.objects.create(
            recipient=user,
            channel="email",
            status="failed",
            related_sos_id=related_sos_id,
            error_message=str(e)
        )


# ---------------------------------------------------
# IN-APP NOTIFICATION
# ---------------------------------------------------

def create_in_app_notification(
    user,
    title,
    message,
    notification_type="general",
    related_sos_id=None
):
    """
    Notification Center ke liye DB entry
    """

    InAppNotification.objects.create(
        recipient=user,
        title=title,
        message=message,
        notification_type=notification_type,
        related_sos_id=related_sos_id,
    )

    NotificationDeliveryLog.objects.create(
        recipient=user,
        channel="in_app",
        status="sent",
        related_sos_id=related_sos_id
    )


# ---------------------------------------------------
# MASTER NOTIFICATION FUNCTION
# ---------------------------------------------------

def notify_user(
    user,
    title,
    message,
    notification_type="general",
    related_sos_id=None
):
    """
    Single entry point
    SOS Alert
    Approval Update
    Escalation
    General Notification
    """

    create_in_app_notification(
        user,
        title,
        message,
        notification_type,
        related_sos_id
    )

    send_push_notification(
        user,
        title,
        message,
        related_sos_id
    )

    send_sms_notification(
        user,
        message,
        related_sos_id
    )

    send_email_notification(
        user,
        title,
        message,
        related_sos_id
    )