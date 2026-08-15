import os
import firebase_admin
from firebase_admin import credentials, messaging
from django.conf import settings

# Django autoreload do baar import karta hai — isse guard karo warna crash hoga
if not firebase_admin._apps:
    cred_path = os.path.join(settings.BASE_DIR, 'firebase_key.json')
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)


def send_push_notification(token, title, body):
    """Real Firebase push. Fail hone par exception raise karega (caller handle karega)."""
    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        token=token,
    )
    return messaging.send(message)