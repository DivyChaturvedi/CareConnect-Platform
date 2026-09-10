import os
import requests
import random
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from .models import OTPVerification


def generate_and_send_otp(user):
    otp = str(random.randint(100000, 999999))
    OTPVerification.objects.create(user=user, otp_code=otp)

    # Prominently log OTP to server logs (always visible in Render logs even if SMTP is blocked)
    print(f"\n=======================================================", flush=True)
    print(f"🔑 [CARECONNECT OTP] To: {user.email} | Code: {otp}", flush=True)
    print(f"=======================================================\n", flush=True)

    # 1. Try Resend HTTP API if configured (Port 443 — works on Render Free)
    resend_api_key = os.environ.get("RESEND_API_KEY")
    if resend_api_key:
        try:
            r = requests.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {resend_api_key}", "Content-Type": "application/json"},
                json={
                    "from": os.environ.get("RESEND_FROM", "CareConnect <onboarding@resend.dev>"),
                    "to": [user.email],
                    "subject": "Your CareConnect Verification Code",
                    "text": f"Hi {user.first_name},\n\nYour OTP for CareConnect verification is: {otp}\n\nThis code is valid for a limited time.",
                },
                timeout=5,
            )
            if r.status_code in (200, 201):
                print(f"[RESEND EMAIL SUCCESS] OTP sent to {user.email}", flush=True)
                return otp
        except Exception as err:
            print(f"[RESEND EMAIL FAILED] {err}", flush=True)

    # 2. Try standard Django SMTP
    try:
        send_mail(
            subject="Your CareConnect Verification Code",
            message=f"Hi {user.first_name},\n\nYour OTP for CareConnect verification is: {otp}\n\nThis code is valid for a limited time. Do not share it with anyone.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        print(f"[SMTP EMAIL SUCCESS] OTP sent to {user.email}", flush=True)
    except Exception as e:
        print(f"[SMTP EMAIL NOTICE] Could not send via SMTP (Render free tier blocks port 587): {e}", flush=True)

    return otp