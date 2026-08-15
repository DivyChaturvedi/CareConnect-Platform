from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import OTPVerification, ResidentProfile, GuardianProfile

User = get_user_model()


class UserAuthAndRoleTests(APITestCase):

    def setUp(self):
        self.resident_password = "SecurePassword123!"
        self.resident_data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.resident@careconnect.com",
            "phone_number": "+1112223334",
            "password": self.resident_password,
            "flat_number": "101-A",
            "block_tower": "Tower 1",
        }

    def test_resident_registration_creates_user_and_profile(self):
        url = reverse("register-resident")
        response = self.client.post(url, self.resident_data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertIn("user_id", response.data["data"])

        # Verify user in database
        user = User.objects.get(email=self.resident_data["email"])
        self.assertEqual(user.role, "RESIDENT")
        self.assertTrue(hasattr(user, "resident_profile"))
        self.assertEqual(user.resident_profile.flat_number, "101-A")

        # Verify OTP entry created
        otp_entry = OTPVerification.objects.filter(user=user, is_used=False).first()
        self.assertIsNotNone(otp_entry)
        self.assertIsNotNone(otp_entry.expires_at)

    def test_registration_fails_on_weak_password(self):
        url = reverse("register-resident")
        data = self.resident_data.copy()
        data["password"] = "123"
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_tokens_and_role_payload(self):
        # Register user
        user = User.objects.create_user(
            email="login.test@careconnect.com",
            password=self.resident_password,
            first_name="Test",
            phone_number="+999000111",
            role="RESIDENT"
        )
        ResidentProfile.objects.create(user=user, flat_number="202")

        login_url = reverse("login")
        response = self.client.post(login_url, {
            "email": "login.test@careconnect.com",
            "password": self.resident_password
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["role"], "RESIDENT")

    def test_otp_verification_activates_profile(self):
        user = User.objects.create_user(
            email="otp.test@careconnect.com",
            password=self.resident_password,
            first_name="OTP",
            phone_number="+999000222",
            role="RESIDENT"
        )
        profile = ResidentProfile.objects.create(user=user, flat_number="303", is_verified=False)
        otp_entry = OTPVerification.objects.create(user=user, otp_code="123456")

        verify_url = reverse("verify-otp")
        response = self.client.post(verify_url, {
            "user_id": user.id,
            "otp_code": "123456"
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

        profile.refresh_from_db()
        self.assertTrue(profile.is_verified)

        otp_entry.refresh_from_db()
        self.assertTrue(otp_entry.is_used)

    def test_resident_directory_access_control(self):
        # Create resident user
        resident_user = User.objects.create_user(
            email="res.dir@careconnect.com",
            password=self.resident_password,
            first_name="Resident",
            phone_number="+999000333",
            role="RESIDENT"
        )

        # Create admin user
        admin_user = User.objects.create_user(
            email="admin.dir@careconnect.com",
            password=self.resident_password,
            first_name="Admin",
            phone_number="+999000444",
            role="ADMIN"
        )

        directory_url = reverse("resident-directory")

        # 1. Resident attempting to view directory should be Forbidden (H-04 fix)
        self.client.force_authenticate(user=resident_user)
        res_response = self.client.get(directory_url)
        self.assertEqual(res_response.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Admin should be allowed
        self.client.force_authenticate(user=admin_user)
        admin_response = self.client.get(directory_url)
        self.assertEqual(admin_response.status_code, status.HTTP_200_OK)

    def test_authenticated_logout_blacklists_refresh_token(self):
        user = User.objects.create_user(
            email="logout.test@careconnect.com",
            password=self.resident_password,
            first_name="LogoutTest",
            phone_number="+999000555",
            role="RESIDENT"
        )

        # Login to get refresh token
        login_response = self.client.post(reverse("login"), {
            "email": "logout.test@careconnect.com",
            "password": self.resident_password
        })
        refresh_token = login_response.data["refresh"]

        logout_url = reverse("logout")

        # Unauthenticated logout attempt should be 401 (C-07 fix)
        unauth_response = self.client.post(logout_url, {"refresh": refresh_token})
        self.assertEqual(unauth_response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated logout should succeed
        self.client.force_authenticate(user=user)
        auth_response = self.client.post(logout_url, {"refresh": refresh_token})
        self.assertEqual(auth_response.status_code, status.HTTP_205_RESET_CONTENT)
