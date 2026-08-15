from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from sos.models import EmergencyCategory, SOSAlert, EscalationConfig, EscalationLog
from sos.tasks import escalate_to_secondary_guardian, escalate_to_security
from emergency.models import EmergencyContact

User = get_user_model()


class SOSTests(APITestCase):

    def setUp(self):
        # Create category
        self.category = EmergencyCategory.objects.create(
            name="Medical Emergency",
            icon="medical-bag",
            description="Medical assistance required"
        )

        # Create resident
        self.resident = User.objects.create_user(
            email="sos.resident@careconnect.com",
            phone_number="+1112224444",
            first_name="Alice",
            role="RESIDENT",
            password="TestPassword123!"
        )

        # Create primary guardian
        self.primary_guardian = User.objects.create_user(
            email="primary.guardian@careconnect.com",
            phone_number="+1112225555",
            first_name="Bob",
            role="GUARDIAN",
            password="TestPassword123!"
        )

        # Create secondary guardian
        self.secondary_guardian = User.objects.create_user(
            email="sec.guardian@careconnect.com",
            phone_number="+1112226666",
            first_name="Charlie",
            role="GUARDIAN",
            password="TestPassword123!"
        )

        # Create emergency contact records for resident
        EmergencyContact.objects.create(
            resident=self.resident,
            name="Bob Guardian",
            phone_number="+1112225555",
            email="primary.guardian@careconnect.com",
            is_primary_guardian=True,
            is_verified=True
        )

        EmergencyContact.objects.create(
            resident=self.resident,
            name="Charlie Guardian",
            phone_number="+1112226666",
            email="sec.guardian@careconnect.com",
            is_secondary_guardian=True,
            is_verified=True
        )

        # Create escalation config
        EscalationConfig.objects.create(response_window_minutes=5, is_active=True)

    def test_resident_can_trigger_sos(self):
        self.client.force_authenticate(user=self.resident)
        url = reverse("sos-trigger")

        payload = {
            "category": self.category.id,
            "message": "Fell down in kitchen",
            "latitude": "12.9715987",
            "longitude": "77.5945627"
        }

        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])

        # Check SOSAlert created
        alert = SOSAlert.objects.get(id=response.data["data"]["id"])
        self.assertEqual(alert.resident, self.resident)
        self.assertEqual(alert.status, "open")

    def test_non_resident_cannot_trigger_sos(self):
        self.client.force_authenticate(user=self.primary_guardian)
        url = reverse("sos-trigger")

        response = self.client.post(url, {"category": self.category.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_guardian_can_respond_to_sos(self):
        alert = SOSAlert.objects.create(
            resident=self.resident,
            category=self.category,
            status="open"
        )

        respond_url = reverse("sos-respond", kwargs={"pk": alert.id})

        # Guardian responds
        self.client.force_authenticate(user=self.primary_guardian)
        response = self.client.post(respond_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

        alert.refresh_from_db()
        self.assertEqual(alert.responded_by, self.primary_guardian)
        self.assertEqual(alert.status, "active")

    def test_resident_cannot_change_sos_status_via_update(self):
        alert = SOSAlert.objects.create(
            resident=self.resident,
            category=self.category,
            status="open"
        )

        update_url = reverse("sos-update", kwargs={"pk": alert.id})
        self.client.force_authenticate(user=self.resident)

        # Attempting to change status from open to closed should fail (H-05 fix)
        response = self.client.patch(update_url, {"status": "closed"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_escalation_task_skips_if_already_responded(self):
        alert = SOSAlert.objects.create(
            resident=self.resident,
            category=self.category,
            status="active",
            responded_by=self.primary_guardian
        )

        # Run secondary escalation task
        result = escalate_to_secondary_guardian(alert.id)
        self.assertIn("already resolved", result)

        alert.refresh_from_db()
        self.assertFalse(alert.is_escalated)

    def test_volunteer_availability_update(self):
        volunteer = User.objects.create_user(
            email="volunteer.test@careconnect.com",
            phone_number="+1112227777",
            first_name="Dave",
            role="VOLUNTEER",
            password="TestPassword123!"
        )
        self.client.force_authenticate(user=volunteer)

        url = reverse("volunteers-availability-update")
        payload = {
            "status": "online",
            "lat": 12.9715,
            "lng": 77.5945
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        from sos.models import VolunteerAvailability
        va = VolunteerAvailability.objects.get(user=volunteer)
        self.assertEqual(va.status, "online")
        self.assertAlmostEqual(float(va.lat), 12.9715)

    def test_broadcast_creation_and_radius_filtering(self):
        alert = SOSAlert.objects.create(
            resident=self.resident,
            category=self.category,
            status="open",
            latitude=12.9715987,
            longitude=77.5945627
        )

        # Create online volunteer within range (~0.1 km)
        vol_near = User.objects.create_user(
            email="vol.near@careconnect.com",
            phone_number="+1112228888",
            first_name="NearVol",
            role="VOLUNTEER"
        )
        from sos.models import VolunteerAvailability, SecurityStaff, Broadcast
        VolunteerAvailability.objects.create(
            user=vol_near, status="online", lat=12.9720, lng=77.5950
        )

        # Create online volunteer OUT of range (~50 km away)
        vol_far = User.objects.create_user(
            email="vol.far@careconnect.com",
            phone_number="+1112229999",
            first_name="FarVol",
            role="VOLUNTEER"
        )
        VolunteerAvailability.objects.create(
            user=vol_far, status="online", lat=13.5000, lng=78.5000
        )

        self.client.force_authenticate(user=self.resident)
        url = reverse("broadcast-list-create")
        response = self.client.post(url, {"incident_id": alert.id, "radius": 2.0})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        broadcast_id = response.data["id"]

        broadcast = Broadcast.objects.get(id=broadcast_id)
        self.assertEqual(broadcast.status, "sent")

        # Verify recipient list contains vol_near and not vol_far
        recipient_user_ids = [r.user.id for r in broadcast.recipients.all()]
        self.assertIn(vol_near.id, recipient_user_ids)
        self.assertNotIn(vol_far.id, recipient_user_ids)

    def test_incident_visibility_simulation(self):
        alert = SOSAlert.objects.create(
            resident=self.resident,
            category=self.category,
            status="open",
            latitude=12.9715987,
            longitude=77.5945627
        )

        url = reverse("incident-visibility", kwargs={"pk": alert.id})
        self.client.force_authenticate(user=self.resident)

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("simulations", response.data)
        self.assertIn("1km", response.data["simulations"])
        self.assertIn("2km", response.data["simulations"])
        self.assertIn("5km", response.data["simulations"])

    def test_incident_state_machine_and_closure_flow(self):
        alert = SOSAlert.objects.create(
            resident=self.resident,
            category=self.category,
            status="open"
        )
        self.client.force_authenticate(user=self.resident)

        # 1. Invalid jump: Open -> Resolved should fail
        status_url = reverse("incident-status-post", kwargs={"pk": alert.id})
        res = self.client.post(status_url, {"status": "resolved"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid Transition", res.data["error"])

        # 2. Get Valid Transitions
        trans_url = reverse("incident-transitions", kwargs={"pk": alert.id})
        res = self.client.get(trans_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("active", res.data["allowed_transitions"])

        # 3. Transition: Open -> Active
        res = self.client.post(status_url, {"status": "active"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # 4. Transition: Active -> Resolved
        res = self.client.post(status_url, {"status": "resolved", "resolution_notes": "Responder arrived"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # 5. Submit Closure Details
        closure_url = reverse("incident-closure", kwargs={"pk": alert.id})
        closure_payload = {
            "resolution_summary": "Medical assistance provided. Patient is stable.",
            "outcome": "assistance_provided",
            "resolution_notes": "First aid delivered on-site."
        }
        res = self.client.post(closure_url, closure_payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])

        # Refresh alert
        alert.refresh_from_db()
        self.assertEqual(alert.status, "closed")
        self.assertEqual(alert.outcome, "assistance_provided")

        # 6. Verify Timeline
        timeline_url = reverse("incident-timeline", kwargs={"pk": alert.id})
        res = self.client.get(timeline_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreater(len(res.data["timeline"]), 0)


