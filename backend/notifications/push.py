import os
import json
import firebase_admin
from firebase_admin import credentials, messaging
from django.conf import settings

_firebase_initialized = False

if not firebase_admin._apps:
    cred_path = os.path.join(settings.BASE_DIR, 'firebase_key.json')
    firebase_json_env = os.environ.get('FIREBASE_CREDENTIALS_JSON', None)

    if os.path.exists(cred_path):
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
        except Exception as e:
            print(f"[FIREBASE WARNING] Could not load certificate: {e}")
    elif firebase_json_env:
        try:
            cert_dict = json.loads(firebase_json_env)
            cred = credentials.Certificate(cert_dict)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
        except Exception as e:
            print(f"[FIREBASE WARNING] Could not parse FIREBASE_CREDENTIALS_JSON env: {e}")
    else:
        print("[FIREBASE NOTICE] firebase_key.json not present. Push notifications operating in mock mode.")


def send_push_notification(token, title, body):
    """Real Firebase push if initialized, otherwise graceful log."""
    if not _firebase_initialized:
        print(f"[MOCK PUSH] To: {token[:12]}... | Title: {title} | Body: {body}")
        return "mock_fcm_message_id"

    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        token=token,
    )
    return messaging.send(message)