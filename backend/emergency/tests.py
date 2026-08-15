from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import GuardianProfile
from .models import EmergencyContact

User = get_user_model()

class EmergencyContactTests(APITestCase):

    def setUp(self):
        # Create a Resident user
        self.resident_user = User.objects.create_user(
            email="resident@careconnect.com",
            phone_number="+1234567890",
            first_name="Resident",
            role="RESIDENT",
            password="testpassword123"
        )
        # Create profile
        from users.models import ResidentProfile
        ResidentProfile.objects.create(
            user=self.resident_user,
            flat_number="101",
            block_tower="A"
        )

        # Create a Guardian user
        self.guardian_user = User.objects.create_user(
            email="guardian@careconnect.com",
            phone_number="+9876543210",
            first_name="Guardian",
            role="GUARDIAN",
            password="testpassword123"
        )
        # Create profile
        self.guardian_profile = GuardianProfile.objects.create(
            user=self.guardian_user,
            relation_to_resident="Father"
        )

        # Create another general user
        self.volunteer_user = User.objects.create_user(
            email="volunteer@careconnect.com",
            phone_number="+5555555555",
            first_name="Volunteer",
            role="VOLUNTEER",
            password="testpassword123"
        )

        # URLs
        self.contact_list_url = reverse("emergency-contact-list")
        self.guardians_url = reverse("emergency-contact-guardians")

    def login_user(self, user):
        # Obtain JWT tokens
        login_url = reverse("login")
        response = self.client.post(login_url, {"email": user.email, "password": "testpassword123"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        access_token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

    def test_role_based_access_control(self):
        # Non-residents should be denied access to contacts CRUD
        self.login_user(self.volunteer_user)
        response = self.client.get(self.contact_list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Residents should be allowed
        self.login_user(self.resident_user)
        response = self.client.get(self.contact_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_emergency_contact_crud(self):
        self.login_user(self.resident_user)
        
        # Create a contact
        payload = {
            "name": "Mom",
            "phone_number": "+9998887776",
            "relationship": "Mother",
            "email": "mom@careconnect.com",
            "is_primary_guardian": True
        }
        response = self.client.post(self.contact_list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Mom")
        self.assertEqual(response.data["is_primary_guardian"], True)

        # Check unique constraint (cannot add duplicate phone number for the same resident)
        response_duplicate = self.client.post(self.contact_list_url, payload)
        self.assertEqual(response_duplicate.status_code, status.HTTP_400_BAD_REQUEST)

        # Update contact
        contact_id = response.data["id"]
        detail_url = reverse("emergency-contact-detail", kwargs={"pk": contact_id})
        update_payload = {
            "name": "Mother",
            "phone_number": "+9998887776",
            "relationship": "Mother"
        }
        response_update = self.client.put(detail_url, update_payload)
        self.assertEqual(response_update.status_code, status.HTTP_200_OK)
        self.assertEqual(response_update.data["name"], "Mother")

        # Delete contact
        response_delete = self.client.delete(detail_url)
        self.assertEqual(response_delete.status_code, status.HTTP_204_NO_CONTENT)

    def test_guardian_constraints_and_shift(self):
        self.login_user(self.resident_user)

        # Create contact 1 (Primary)
        contact1 = EmergencyContact.objects.create(
            resident=self.resident_user,
            name="Contact 1",
            phone_number="+1111111111",
            relationship="Friend",
            is_primary_guardian=True
        )

        # Create contact 2 (Secondary)
        contact2 = EmergencyContact.objects.create(
            resident=self.resident_user,
            name="Contact 2",
            phone_number="+2222222222",
            relationship="Brother",
            is_secondary_guardian=True
        )

        # Validate initially
        self.assertTrue(EmergencyContact.objects.get(pk=contact1.pk).is_primary_guardian)
        self.assertTrue(EmergencyContact.objects.get(pk=contact2.pk).is_secondary_guardian)

        # Retrieve via /api/emergency/contacts/guardians/
        response = self.client.get(self.guardians_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["primary"]["name"], "Contact 1")
        self.assertEqual(response.data["secondary"]["name"], "Contact 2")

        # Make contact 2 Primary — check that contact 1 loses its primary flag
        contact2.is_primary_guardian = True
        contact2.save()

        self.assertFalse(EmergencyContact.objects.get(pk=contact1.pk).is_primary_guardian)
        self.assertTrue(EmergencyContact.objects.get(pk=contact2.pk).is_primary_guardian)
        # Check that it also lost secondary flag because it's now primary
        self.assertFalse(EmergencyContact.objects.get(pk=contact2.pk).is_secondary_guardian)

    def test_contact_otp_verification_and_guardian_link(self):
        self.login_user(self.resident_user)

        # Create a contact matching the registered Guardian phone number
        contact = EmergencyContact.objects.create(
            resident=self.resident_user,
            name="Father",
            phone_number=self.guardian_user.phone_number,
            relationship="Father"
        )
        self.assertFalse(contact.is_verified)
        self.assertFalse(GuardianProfile.objects.get(pk=self.guardian_profile.pk).is_verified)

        # Send verification code
        send_url = reverse("emergency-contact-send-verification", kwargs={"pk": contact.pk})
        response_send = self.client.post(send_url)
        self.assertEqual(response_send.status_code, status.HTTP_200_OK)
        otp_code = response_send.data["otp_code"]

        # Verify with code
        verify_url = reverse("emergency-contact-verify", kwargs={"pk": contact.pk})
        response_verify = self.client.post(verify_url, {"otp_code": otp_code})
        self.assertEqual(response_verify.status_code, status.HTTP_200_OK)
        self.assertTrue(response_verify.data["is_verified"])

        # Check that the contact is verified
        contact.refresh_from_db()
        self.assertTrue(contact.is_verified)

        # Check that the registered guardian profile is auto-verified and linked
        self.guardian_profile.refresh_from_db()
        self.assertTrue(self.guardian_profile.is_verified)
        self.assertEqual(self.guardian_profile.linked_resident_phone, self.resident_user.phone_number)
