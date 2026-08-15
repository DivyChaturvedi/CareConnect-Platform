from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from emergency.models import EmergencyContact
from notifications.services import notify_user

User = get_user_model()


def notify_contact(contact, title, message, related_sos_id=None):
    """EmergencyContact (jo zaroori nahi ki app user ho) ko notify karta hai"""
    if contact.email:
        try:
            send_mail(title, message, settings.DEFAULT_FROM_EMAIL, [contact.email], fail_silently=True)
        except Exception:
            pass
    if contact.phone_number:
        print(f"[MOCK SMS] To: {contact.phone_number} | {message}")

    # Agar contact ka koi registered app account hai (email match), to in-app bhi bhejo
    matched_user = User.objects.filter(email=contact.email).first() if contact.email else None
    if matched_user:
        notify_user(matched_user, title, message, notification_type="sos_alert", related_sos_id=related_sos_id)


def route_sos_alert(alert):
    """SOS create hote hi sirf Primary Guardian ko notify karta hai (Stage 1)"""
    resident = alert.resident
    category_name = alert.category.name if alert.category else "Emergency"
    title = f"🆘 SOS Alert: {category_name}"
    message = f"{resident.first_name} {resident.last_name} triggered a {category_name} alert."
    if alert.address:
        message += f" Location: {alert.address}"

    primary_guardians = EmergencyContact.objects.filter(
        resident=resident, is_primary_guardian=True, is_verified=True
    )

    for contact in primary_guardians:
        notify_contact(contact, title, message, related_sos_id=alert.id)

    return primary_guardians.count()






def broadcast_to_community(alert):
    """Turant online volunteers aur saari security ko notify karta hai (Guardian escalation ke parallel)"""
    category_name = alert.category.name if alert.category else "Emergency"
    title = f"🆘 Community Alert: {category_name}"
    message = f"{alert.resident.first_name} {alert.resident.last_name} needs help nearby."
    if alert.address:
        message += f" Location: {alert.address}"

    # Online, verified volunteers
    volunteers = User.objects.filter(
        role="VOLUNTEER", is_active=True, volunteer_profile__availability_status="online",
        volunteer_profile__is_verified=True,
    )
    for vol in volunteers:
        notify_user(vol, title, message, notification_type="sos_alert", related_sos_id=alert.id)

    # All active security
    security_users = User.objects.filter(role="SECURITY", is_active=True)
    for sec in security_users:
        notify_user(sec, title, message, notification_type="sos_alert", related_sos_id=alert.id)

    return volunteers.count() + security_users.count()



VALID_TRANSITIONS = {
    'open': ['active', 'closed'],
    'active': ['escalated', 'resolved', 'closed'],
    'escalated': ['resolved', 'closed'],
    'resolved': ['closed'],
    'closed': [],  # terminal state
}

BLOCKED_TRANSITION_REASONS = {
    ('open', 'resolved'): "Invalid Transition: Cannot jump directly from Open to Resolved. Responder must accept/active or escalate first.",
    ('escalated', 'open'): "Invalid Transition: Cannot revert Escalated incident back to Open.",
    ('resolved', 'active'): "Invalid Transition: Cannot revert Resolved incident back to Active.",
    ('closed', 'active'): "Invalid Transition: Closed is a terminal state and cannot be reopened to Active.",
    ('closed', 'escalated'): "Invalid Transition: Closed is a terminal state and cannot be escalated.",
}


def validate_status_transition(current_status, new_status):
    """Returns (is_valid, error_message)"""
    if current_status == new_status:
        return True, None
    
    blocked_reason = BLOCKED_TRANSITION_REASONS.get((current_status, new_status))
    if blocked_reason:
        return False, blocked_reason

    allowed = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        return False, f"Cannot transition from '{current_status}' to '{new_status}'. Allowed transitions from '{current_status}': {allowed}"
    
    return True, None



def get_alert_society(alert):
    """Resident ke flat se society nikaalta hai (agar mapped hai)"""
    try:
        return alert.resident.resident_profile.flat.block.society
    except Exception:
        return None
