from celery import shared_task
from django.conf import settings
from .models import ResponseUpdate


@shared_task
def escalate_to_secondary_guardian(alert_id):
    from .models import SOSAlert, EscalationConfig, EscalationLog
    from emergency.models import EmergencyContact
    from .services import notify_contact

    try:
        alert = SOSAlert.objects.get(id=alert_id)
    except SOSAlert.DoesNotExist:
        return

    if alert.responded_by is not None or alert.status in ['resolved', 'closed']:
        return f"Alert {alert.id} already resolved"

    alert.is_escalated = True
    alert.status = 'escalated'
    alert.save()


    category_name = alert.category.name if alert.category else "Emergency"
    title = "⚠️ Escalated SOS Alert (Secondary Guardian)"
    message = (
        f"Primary guardian did not respond. {alert.resident.first_name} {alert.resident.last_name} "
        f"needs urgent help. Category: {category_name}."
    )
    if alert.address:
        message += f" Location: {alert.address}"

    secondary_contacts = EmergencyContact.objects.filter(
        resident=alert.resident, is_secondary_guardian=True, is_verified=True
    )
    for contact in secondary_contacts:
            notify_contact(contact, title, message, related_sos_id=alert.id)
            EscalationLog.objects.create(
                alert=alert, escalated_to_name=contact.name,
                escalated_to_phone=contact.phone_number, escalated_to_email=contact.email,
                reason="No response from primary guardian",
            )
            ResponseUpdate.objects.create(
            alert=alert, actor=None, update_type='escalated',
            description=f"Escalated to {contact.name}",
        )

    # Agla stage schedule karo — Security
    config = EscalationConfig.objects.filter(is_active=True).first()
    window_minutes = config.response_window_minutes if config else 5
    escalate_to_security.apply_async(args=[alert_id], countdown=window_minutes * 60)

    return f"Escalated alert {alert_id} to {secondary_contacts.count()} secondary guardians"


@shared_task
def escalate_to_security(alert_id):
    from .models import SOSAlert, EscalationLog
    from users.models import User
    from notifications.services import notify_user

    try:
        alert = SOSAlert.objects.get(id=alert_id)
    except SOSAlert.DoesNotExist:
        return

    if alert.responded_by is not None or alert.status in ['resolved', 'closed']:
        return  # Secondary Guardian ne respond kar diya

    category_name = alert.category.name if alert.category else "Emergency"
    title = "🚨 Final Escalation: Security Required"
    message = (
        f"No guardian response. {alert.resident.first_name} {alert.resident.last_name} "
        f"needs immediate assistance. Category: {category_name}."
    )
    if alert.address:
        message += f" Location: {alert.address}"

    security_users = User.objects.filter(role="SECURITY", is_active=True)
    for sec_user in security_users:
        notify_user(sec_user, title, message, notification_type="escalation", related_sos_id=alert.id)
        EscalationLog.objects.create(
            alert=alert, escalated_to_name=f"{sec_user.first_name} {sec_user.last_name}",
            escalated_to_phone=sec_user.phone_number, escalated_to_email=sec_user.email,
            reason="No response from secondary guardian",
        )

        ResponseUpdate.objects.create(
            alert=alert, actor=None, update_type='escalated',
            description=f"Escalated to {sec_user.first_name}",
        )    

    return f"Escalated alert {alert_id} to {security_users.count()} security personnel"




