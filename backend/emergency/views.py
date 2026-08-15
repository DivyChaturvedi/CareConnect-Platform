import random
from datetime import timedelta

from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from users.permissions import IsResident
from users.models import GuardianProfile

from .models import EmergencyContact
from .serializers import EmergencyContactSerializer, VerifyContactOTPSerializer

User = get_user_model()

class EmergencyContactViewSet(viewsets.ModelViewSet):
    serializer_class = EmergencyContactSerializer
    permission_classes = [permissions.IsAuthenticated, IsResident]

    def get_queryset(self):
    # Prevent Swagger schema generation errors
        if getattr(self, "swagger_fake_view", False):
            return EmergencyContact.objects.none()

    # Extra safety
        if not self.request.user.is_authenticated:
            return EmergencyContact.objects.none()

        return EmergencyContact.objects.filter(
            resident=self.request.user
        )

    @action(detail=False, methods=["get"], url_path="guardians")
    def guardians(self, request):
        """
        Retrieve primary and secondary guardians configured for the logged-in resident.
        """
        queryset = self.get_queryset()
        primary = queryset.filter(is_primary_guardian=True).first()
        secondary = queryset.filter(is_secondary_guardian=True).first()

        return Response({
            "primary": EmergencyContactSerializer(primary, context={"request": request}).data if primary else None,
            "secondary": EmergencyContactSerializer(secondary, context={"request": request}).data if secondary else None
        })

    @action(detail=True, methods=["post"], url_path="send-verification")
    def send_verification(self, request, pk=None):
        """
        Generate and send (mock) verification OTP to emergency contact.
        """
        contact = self.get_object()
        otp = str(random.randint(100000, 999999))
        contact.otp_code = otp
        contact.otp_created_at = timezone.now()
        contact.save()

        # Print to console for verification
        print(f"[MOCK CONTACT OTP] Sending OTP {otp} to {contact.name} ({contact.phone_number})")

        return Response({
            "message": "OTP sent successfully (mocked).",
            "otp_code": otp  # Returned for easy manual and integration testing
        })

    @action(detail=True, methods=["post"], url_path="verify")
    def verify(self, request, pk=None):
        """
        Verify the OTP and optionally link/update registered Guardian user profile.
        """
        contact = self.get_object()
        serializer = VerifyContactOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        otp_code = serializer.validated_data["otp_code"]

        if contact.otp_code != otp_code:
            return Response({"error": "Invalid OTP code."}, status=status.HTTP_400_BAD_REQUEST)

        if contact.otp_created_at and timezone.now() - contact.otp_created_at > timedelta(minutes=10):
            return Response({"error": "OTP expired."}, status=status.HTTP_400_BAD_REQUEST)

        contact.is_verified = True
        contact.otp_code = None
        contact.otp_created_at = None
        contact.save()

        # Cross-verification logic: If a user with the GUARDIAN role matches the contact phone number,
        # update their GuardianProfile to is_verified=True and link to resident phone.
        try:
            guardian_user = User.objects.filter(phone_number=contact.phone_number, role="GUARDIAN").first()
            if guardian_user:
                profile, created = GuardianProfile.objects.get_or_create(user=guardian_user)
                profile.is_verified = True
                profile.linked_resident_phone = request.user.phone_number
                profile.save()
                print(f"[LINK] Linked registered Guardian {guardian_user.email} with Resident {request.user.email}")
        except Exception as e:
            print(f"[LINK ERROR] Could not auto-link guardian profile: {e}")

        return Response({
            "message": "Emergency contact verified successfully.",
            "is_verified": contact.is_verified
        })
