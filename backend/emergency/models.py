from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

class EmergencyContact(models.Model):
    resident = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="emergency_contacts"
    )
    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15)
    relationship = models.CharField(max_length=50)
    email = models.EmailField(blank=True, null=True)

    is_primary_guardian = models.BooleanField(default=False)
    is_secondary_guardian = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    otp_code = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("resident", "phone_number")
        ordering = ["-is_primary_guardian", "-is_secondary_guardian", "name"]

    def clean(self):
        # A resident cannot add themselves as their own emergency contact
        if self.resident and self.resident.phone_number == self.phone_number:
            raise ValidationError("You cannot add yourself as an emergency contact.")
        
        # Enforce role logic if necessary (e.g. only RESIDENT users can have contacts)
        if self.resident and self.resident.role != "RESIDENT":
            raise ValidationError("Only users with the Resident role can configure emergency contacts.")

    def save(self, *args, **kwargs):
        self.clean()
        
        # Enforce that there can only be one primary guardian per resident
        if self.is_primary_guardian:
            # We must handle update cases properly
            # Set other primary guardians to False
            EmergencyContact.objects.filter(
                resident=self.resident,
                is_primary_guardian=True
            ).exclude(pk=self.pk).update(is_primary_guardian=False)
            
            # If a contact is primary, they cannot also be secondary
            self.is_secondary_guardian = False

        # Enforce that there can only be one secondary guardian per resident
        if self.is_secondary_guardian:
            # Set other secondary guardians to False
            EmergencyContact.objects.filter(
                resident=self.resident,
                is_secondary_guardian=True
            ).exclude(pk=self.pk).update(is_secondary_guardian=False)

        super().save(*args, **kwargs)

    def __str__(self):
        role_suffix = ""
        if self.is_primary_guardian:
            role_suffix = " (Primary Guardian)"
        elif self.is_secondary_guardian:
            role_suffix = " (Secondary Guardian)"
        return f"{self.name} - {self.relationship}{role_suffix}"
