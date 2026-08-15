from django.db import models
from django.conf import settings


class InAppNotification(models.Model):

    NOTIFICATION_TYPE_CHOICES = (
        ("sos_alert", "SOS Alert"),
        ("escalation", "Escalation"),
        ("approval", "Approval Update"),
        ("general", "General"),
    )

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications"
    )

    title = models.CharField(max_length=150)

    message = models.TextField()

    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPE_CHOICES,
        default="general"
    )

    related_sos_id = models.IntegerField(
        blank=True,
        null=True
    )

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} -> {self.recipient.first_name}"


class NotificationDeliveryLog(models.Model):

    CHANNEL_CHOICES = (
        ("push", "Push"),
        ("sms", "SMS"),
        ("email", "Email"),
        ("in_app", "In-App"),
    )

    STATUS_CHOICES = (
        ("sent", "Sent"),
        ("delivered", "Delivered"),
        ("failed", "Failed"),
    )

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="delivery_logs"
    )

    channel = models.CharField(
        max_length=10,
        choices=CHANNEL_CHOICES
    )

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="sent"
    )

    related_sos_id = models.IntegerField(
        blank=True,
        null=True
    )

    error_message = models.TextField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.channel} -> {self.recipient.first_name} ({self.status})"


class NotificationTemplate(models.Model):

    NOTIFICATION_TYPE_CHOICES = (
        ("sos_alert", "SOS Alert"),
        ("escalation", "Escalation"),
        ("approval", "Approval Update"),
        ("general", "General"),
    )

    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPE_CHOICES,
        unique=True
    )

    title_template = models.CharField(
        max_length=150,
        help_text="Use placeholders like {name}, {category}"
    )

    body_template = models.TextField(
        help_text="Use placeholders like {name}, {category}, {location}"
    )

    is_active = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.notification_type
    




class DeviceToken(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="device_tokens"
    )

    token = models.TextField(unique=True)

    device_type = models.CharField(
        max_length=20,
        choices=(
            ("android", "Android"),
            ("ios", "iOS"),
        )
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.first_name} - {self.device_type}"
