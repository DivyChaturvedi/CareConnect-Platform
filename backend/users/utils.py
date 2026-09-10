import os
import requests
import random
import threading
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from .models import OTPVerification


def _deliver_email_async(to_email, first_name, otp):
    """Background worker to send email via Resend, Brevo, or SMTP without blocking the API response."""
    google_script_url = (os.environ.get("GOOGLE_MAIL_SCRIPT_URL") or "").strip()
    resend_api_key = (os.environ.get("RESEND_API_KEY") or "").strip()
    brevo_api_key = (os.environ.get("BREVO_API_KEY") or "").strip()

    # 1. Try Google Apps Script (100% Free via personal Gmail, port 443, no domain needed)
    if google_script_url:
        try:
            print(f"[GOOGLE MAIL ATTEMPT] Sending to {to_email} via Google...", flush=True)
            r = requests.post(
                google_script_url,
                json={
                    "to": to_email,
                    "subject": "Your CareConnect Verification Code",
                    "html": f"""
                    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f5;">
                        <div style="max-width: 480px; margin: auto; background: white; padding: 30px; border-radius: 8px; border: 1px solid #e4e4e7;">
                            <h2 style="color: #2563eb; margin-top: 0;">CareConnect Verification</h2>
                            <p>Hi <b>{first_name}</b>,</p>
                            <p>Your verification code for CareConnect is:</p>
                            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e293b; background: #f1f5f9; padding: 12px; text-align: center; border-radius: 6px; margin: 20px 0;">
                                {otp}
                            </div>
                            <p style="color: #64748b; font-size: 13px;">This OTP is valid for a limited time. Do not share it with anyone.</p>
                        </div>
                    </div>
                    """
                },
                timeout=8,
            )
            print(f"[GOOGLE MAIL RESPONSE] Status: {r.status_code} | Body: {r.text}", flush=True)
            if r.status_code == 200:
                print(f"[EMAIL SUCCESS] Delivered to {to_email} via Google Apps Script!", flush=True)
                return
        except Exception as err:
            print(f"[GOOGLE MAIL EXCEPTION] {err}", flush=True)

    # 2. Try Resend HTTP API (Port 443 — works seamlessly on Render)
    if resend_api_key:
        try:
            print(f"[RESEND ATTEMPT] Sending to {to_email} via Resend...", flush=True)
            r = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": os.environ.get("RESEND_FROM", "CareConnect <onboarding@resend.dev>"),
                    "to": [to_email],
                    "subject": "Your CareConnect Verification Code",
                    "html": f"""
                    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f5;">
                        <div style="max-width: 480px; margin: auto; background: white; padding: 30px; border-radius: 8px; border: 1px solid #e4e4e7;">
                            <h2 style="color: #2563eb; margin-top: 0;">CareConnect Verification</h2>
                            <p>Hi <b>{first_name}</b>,</p>
                            <p>Your verification code for CareConnect is:</p>
                            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e293b; background: #f1f5f9; padding: 12px; text-align: center; border-radius: 6px; margin: 20px 0;">
                                {otp}
                            </div>
                            <p style="color: #64748b; font-size: 13px;">This OTP is valid for a limited time. Do not share it with anyone.</p>
                        </div>
                    </div>
                    """,
                },
                timeout=6,
            )
            print(f"[RESEND RESPONSE] Status: {r.status_code} | Body: {r.text}", flush=True)
            if r.status_code in (200, 201):
                print(f"[EMAIL SUCCESS] Delivered to {to_email} via Resend!", flush=True)
                return
            else:
                print(f"[RESEND WARNING] Resend rejected email: {r.text}", flush=True)
        except Exception as err:
            print(f"[RESEND EXCEPTION] {err}", flush=True)

    # 2. Try Brevo HTTP API (Port 443 — allows any recipient email)
    if brevo_api_key:
        try:
            print(f"[BREVO ATTEMPT] Sending to {to_email} via Brevo...", flush=True)
            r = requests.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": brevo_api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "sender": {"name": "CareConnect", "email": "careconnectcommunity76@gmail.com"},
                    "to": [{"email": to_email, "name": first_name}],
                    "subject": "Your CareConnect Verification Code",
                    "textContent": f"Hi {first_name},\n\nYour OTP for CareConnect verification is: {otp}\n\nThis code is valid for 10 minutes.",
                },
                timeout=6,
            )
            print(f"[BREVO RESPONSE] Status: {r.status_code} | Body: {r.text}", flush=True)
            if r.status_code in (200, 201):
                print(f"[EMAIL SUCCESS] Delivered to {to_email} via Brevo!", flush=True)
                return
        except Exception as err:
            print(f"[BREVO EXCEPTION] {err}", flush=True)

    # 3. Fallback: Standard Django SMTP (with strict 3s timeout for local dev)
    if not os.environ.get("RENDER"):
        try:
            send_mail(
                subject="Your CareConnect Verification Code",
                message=f"Hi {first_name},\n\nYour OTP for CareConnect verification is: {otp}\n\nThis code is valid for a limited time.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                fail_silently=False,
            )
            print(f"[SMTP EMAIL SUCCESS] Delivered to {to_email}", flush=True)
        except Exception as e:
            print(f"[SMTP EMAIL FAILED]: {e}", flush=True)
    else:
        print(f"[RENDER NOTICE] Standard SMTP skipped on Render cloud (outbound port 587 is blocked).", flush=True)


def generate_and_send_otp(user):
    otp = str(random.randint(100000, 999999))
    OTPVerification.objects.create(user=user, otp_code=otp)

    # Always prominently print OTP to server logs
    print(f"\n=======================================================", flush=True)
    print(f"🔑 [CARECONNECT OTP] To: {user.email} | Code: {otp}", flush=True)
    print(f"=======================================================\n", flush=True)

    # Dispatch email sending in background thread so the HTTP request completes INSTANTLY (< 100ms)
    t = threading.Thread(target=_deliver_email_async, args=(user.email, user.first_name, otp), daemon=True)
    t.start()

    return otp