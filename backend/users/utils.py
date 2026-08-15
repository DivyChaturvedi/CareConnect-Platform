import random
from datetime import timedelta
from django.utils import timezone

from django.core.mail import send_mail
from django.conf import settings
from .models import OTPVerification


def generate_and_send_otp(user):
    otp = str(random.randint(100000, 999999))
    OTPVerification.objects.create(user=user, otp_code=otp)

    try:
        send_mail(
            subject="Your CareConnect Verification Code",
            message=f"Hi {user.first_name},\n\nYour OTP for CareConnect verification is: {otp}\n\nThis code is valid for a limited time. Do not share it with anyone.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        print(f"[REAL EMAIL] OTP sent to {user.email}")
    except Exception as e:
        print(f"[EMAIL FAILED] Could not send OTP to {user.email}: {e}")

    return otp