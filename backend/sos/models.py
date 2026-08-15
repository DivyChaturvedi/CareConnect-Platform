from django.db import models
from django.conf import settings


class EmergencyCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=50, blank=True, null=True)  # e.g. emoji or icon name
    description = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class SOSAlert(models.Model):
    STATUS_CHOICES = (
        ("open", "Open"),
        ("active", "Active"),
        ("escalated", "Escalated"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
    )

    OUTCOME_CHOICES = (
        ("assistance_provided", "Assistance Provided"),
        ("resolved_onsite", "Resolved On-Site"),
        ("false_alarm", "False Alarm"),
        ("external_escalation", "Escalated to External Emergency Services"),
    )

    resident = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sos_alerts"
    )
    category = models.ForeignKey(
        EmergencyCategory,
        on_delete=models.SET_NULL,
        null=True,
        related_name="alerts"
    )
    message = models.TextField(blank=True, null=True)
    latitude = models.DecimalField(max_digits=10,decimal_places=7,blank=True,null=True)

    longitude = models.DecimalField(max_digits=10,decimal_places=7,blank=True,null=True)
    address = models.CharField(max_length=255, blank=True, null=True)  # Day 8 reverse geocoding se aayega
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    responded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='responded_alerts'
    )
    responded_at = models.DateTimeField(null=True, blank=True)
    is_escalated = models.BooleanField(default=False)

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_incidents'
    )
    assigned_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True, null=True)
    resolution_summary = models.TextField(blank=True, null=True)
    outcome = models.CharField(max_length=50, choices=OUTCOME_CHOICES, blank=True, null=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"SOS by {self.resident.first_name} - {self.category} ({self.status})"


class IncidentAttachment(models.Model):
    incident = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='incident_attachments/')
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_type = models.CharField(max_length=50, blank=True, null=True)
    file_size = models.PositiveIntegerField(blank=True, null=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Attachment {self.file_name or self.id} for INC-{self.incident.id}"

    





class EscalationLog(models.Model):
    alert = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name='escalation_logs')
    escalated_to_name = models.CharField(max_length=100)
    escalated_to_phone = models.CharField(max_length=15, blank=True, null=True)
    escalated_to_email = models.EmailField(blank=True, null=True)
    reason = models.CharField(max_length=255, default="No response from primary guardian")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Escalated {self.alert.id} to {self.escalated_to_name}"


class EscalationConfig(models.Model):
    """Admin configure kare kitni der mein escalate karna hai"""
    response_window_minutes = models.PositiveIntegerField(default=5)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Response window: {self.response_window_minutes} min"


class IncidentVisibilityConfig(models.Model):
    default_radius = models.FloatField(default=2.0)  # in km
    max_radius = models.FloatField(default=5.0)  # in km
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Visibility: default={self.default_radius}km, max={self.max_radius}km"


class Broadcast(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("sent", "Sent"),
        ("failed", "Failed"),
    )
    incident = models.ForeignKey(
        SOSAlert,
        on_delete=models.CASCADE,
        related_name="broadcasts"
    )
    radius = models.FloatField(default=2.0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Broadcast for INC-{self.incident.id} (Radius: {self.radius}km) - {self.status}"


class BroadcastRecipient(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("notified", "Notified"),
        ("failed", "Failed"),
        ("responded", "Responded"),
    )
    broadcast = models.ForeignKey(
        Broadcast,
        on_delete=models.CASCADE,
        related_name="recipients"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="broadcast_receipts"
    )
    role = models.CharField(max_length=20)  # volunteer, security, member
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    notified_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Recipient {self.user.first_name} ({self.role}) - {self.status}"


class VolunteerAvailability(models.Model):
    STATUS_CHOICES = (
        ("online", "Online"),
        ("offline", "Offline"),
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="volunteer_availability"
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="offline")
    lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Volunteer {self.user.first_name}: {self.status} @ ({self.lat}, {self.lng})"


class SecurityStaff(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="security_staff"
    )
    post = models.CharField(max_length=100, blank=True, null=True)
    lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Security {self.user.first_name} ({self.post}) - {'Active' if self.is_active else 'Inactive'}"




class ChatMessage(models.Model):
    MESSAGE_TYPE_CHOICES = (
        ("text", "Text"),
        ("image", "Image"),
    )
    alert = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name='chat_messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message = models.TextField(blank=True)
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPE_CHOICES, default='text')
    image_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.first_name}: {self.message[:30]}"


class ChatReadStatus(models.Model):
    alert = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name='read_statuses')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    last_read_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('alert', 'user')




class ResponseUpdate(models.Model):
    UPDATE_TYPE_CHOICES = (
        ("accepted", "Accepted"),
        ("status_changed", "Status Changed"),
        ("escalated", "Escalated"),
        ("note", "Note"),
    )
    alert = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name='response_updates')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    update_type = models.CharField(max_length=20, choices=UPDATE_TYPE_CHOICES)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.update_type}: {self.description}"
    