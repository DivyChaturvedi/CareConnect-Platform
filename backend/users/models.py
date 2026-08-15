from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from .managers import UserManager
from django.conf import settings


class User(AbstractBaseUser, PermissionsMixin):

    ROLE_CHOICES = (
        ("ADMIN", "Admin"),
        ("RESIDENT", "Resident"),
        ("GUARDIAN", "Guardian"),
        ("VOLUNTEER", "Volunteer"),
        ("SECURITY", "Security"),
    )

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, unique=True)

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="RESIDENT"
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "phone_number"]

    def __str__(self):
        return f"{self.first_name} ({self.role})"
    


from society.models import Flat  # NEW import - top pe add karo

class ResidentProfile(models.Model):
    APPROVAL_STATUS_CHOICES = (
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='resident_profile')
    flat_number = models.CharField(max_length=20)
    block_tower = models.CharField(max_length=50, blank=True, null=True)
    society_name = models.CharField(max_length=100, blank=True, null=True)  # free-text, Day 3 registration ke time
    emergency_notes = models.TextField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)

    # Documents & Mapping Request details
    aadhaar_card = models.FileField(upload_to='resident_documents/aadhaar/', blank=True, null=True)
    address_proof = models.FileField(upload_to='resident_documents/address/', blank=True, null=True)
    requested_at = models.DateTimeField(auto_now_add=True, null=True)

    # ---------- Day 5: Actual mapping fields ----------
    flat = models.ForeignKey(
        Flat, on_delete=models.SET_NULL, null=True, blank=True, related_name='residents'
    )
    approval_status = models.CharField(
        max_length=20, choices=APPROVAL_STATUS_CHOICES, default='pending'
    )

class GuardianProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='guardian_profile')
    relation_to_resident = models.CharField(max_length=50)
    linked_resident_phone = models.CharField(max_length=15, blank=True, null=True)  # Day 5/6 mein proper link
    is_verified = models.BooleanField(default=False)

class VolunteerProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='volunteer_profile')
    area_of_service = models.CharField(max_length=100, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    availability_status = models.CharField(
        max_length=10,
        choices=[
            ("online", "Online"),
            ("offline", "Offline")
        ],
        default="offline"
    )

class SecurityProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='security_profile')
    shift_start = models.TimeField()
    shift_end = models.TimeField()
    guard_id = models.CharField(max_length=30, unique=True)
    is_verified = models.BooleanField(default=False)    


from datetime import timedelta
from django.utils import timezone


def otp_expiry_time():
    return timezone.now() + timedelta(minutes=10)

from datetime import timedelta
from django.utils import timezone

class OTPVerification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    otp_code = models.CharField(max_length=6)
    expires_at = models.DateTimeField(
    default=otp_expiry_time
    )

    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)    
    