"""
SMS Service — Supports MSG91 and Twilio.
settings.py mein set karo:

  Option A - MSG91 (India):
    MSG91_AUTH_KEY = "your-key"
    MSG91_SENDER_ID = "CRCNCT"   # 6-char DLT approved sender ID

  Option B - Twilio (International / easy testing):
    TWILIO_ACCOUNT_SID = "ACxxxxxxxx"
    TWILIO_AUTH_TOKEN  = "your_token"
    TWILIO_FROM_NUMBER = "+1234567890"

Agar koi bhi set nahi hai → [MOCK SMS] console print hoga (dev mode).
"""

import requests
from django.conf import settings


def send_sms(phone, message):
    """
    Auto-detect karta hai:
    1. Twilio (agar TWILIO_ACCOUNT_SID set hai)
    2. MSG91 (agar MSG91_AUTH_KEY set hai)
    3. MOCK mode (dev/testing)
    """
    # ── Twilio ────────────────────────────────────────────────────────
    twilio_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
    if twilio_sid:
        _send_via_twilio(phone, message, twilio_sid)
        return

    # ── MSG91 ─────────────────────────────────────────────────────────
    msg91_key = getattr(settings, 'MSG91_AUTH_KEY', None)
    if msg91_key:
        _send_via_msg91(phone, message, msg91_key)
        return

    # ── Mock (development) ────────────────────────────────────────────
    print(f"[MOCK SMS] To: {phone} | Message: {message}")


def _send_via_twilio(phone, message, account_sid):
    """Twilio SMS — best for testing, works without DLT."""
    try:
        auth_token   = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
        from_number  = getattr(settings, 'TWILIO_FROM_NUMBER', '')

        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        response = requests.post(
            url,
            data={"From": from_number, "To": f"+91{phone}" if not phone.startswith("+") else phone, "Body": message},
            auth=(account_sid, auth_token),
            timeout=10,
        )
        if response.status_code == 201:
            print(f"[TWILIO SMS SENT] To: {phone}")
        else:
            print(f"[TWILIO ERROR] {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[TWILIO EXCEPTION] {e}")


def _send_via_msg91(phone, message, auth_key):
    """MSG91 SMS — India ke liye, DLT approval chahiye production mein."""
    try:
        sender_id = getattr(settings, 'MSG91_SENDER_ID', 'CRCNCT')
        url = "https://api.msg91.com/api/v5/flow/"
        headers = {
            "authkey": auth_key,
            "Content-Type": "application/json",
        }
        payload = {
            "sender":  sender_id,
            "mobiles": f"91{phone}" if not phone.startswith("91") else phone,
            "message": message,
        }
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.ok:
            print(f"[MSG91 SMS SENT] To: {phone}")
        else:
            print(f"[MSG91 ERROR] {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[MSG91 EXCEPTION] {e}")