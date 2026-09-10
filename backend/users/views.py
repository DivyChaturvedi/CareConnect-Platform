from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User
from rest_framework import status
from django.db import models
from django.utils import timezone
from datetime import timedelta

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import RegisterSerializer, UserProfileSerializer,LogoutSerializer,CustomTokenObtainPairSerializer,VolunteerAvailabilitySerializer


from django.contrib.auth import get_user_model
from .models import OTPVerification
from .serializers import OTPVerifySerializer
from .models import User, OTPVerification, ResidentProfile
from .models import ResidentProfile

from rest_framework.exceptions import PermissionDenied

from rest_framework import generics, status

from .permissions import IsAdminOrSecurity,IsAdmin


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer



class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "message": "Profile updated successfully",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        return self.put(request)    
    
from rest_framework.permissions import AllowAny

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": "Logout successful"},
            status=status.HTTP_205_RESET_CONTENT,
        )


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response({
            "message": "Welcome Admin!",
            "user": request.user.first_name,
            "role": request.user.role
        })    


from rest_framework import generics, status
from rest_framework.response import Response
from .serializers import (
    ResidentRegistrationSerializer, GuardianRegistrationSerializer,
    VolunteerRegistrationSerializer, SecurityRegistrationSerializer
)
from .utils import generate_and_send_otp

class ResidentRegisterView(generics.CreateAPIView):
    serializer_class = ResidentRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        otp = generate_and_send_otp(user)
        return Response(
            {
                "success": True,
                "message": "Registered. OTP sent for verification.",
                "data": {
                    "user_id": user.id,
                    "dev_otp": otp,
                }
            },
            status=status.HTTP_201_CREATED
        )

# GuardianRegisterView, VolunteerRegisterView, SecurityRegisterView — same pattern, serializer_class change karo

class GuardianRegisterView(generics.CreateAPIView):
    serializer_class = GuardianRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        otp = generate_and_send_otp(user)
        return Response(
            {
                "success": True,
                "message": "Registered. OTP sent for verification.",
                "data": {
                    "user_id": user.id,
                    "dev_otp": otp,
                }
            },
            status=status.HTTP_201_CREATED
        )


class VolunteerRegisterView(generics.CreateAPIView):
    serializer_class = VolunteerRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        otp = generate_and_send_otp(user)
        return Response(
            {
                "success": True,
                "message": "Registered. OTP sent for verification.",
                "data": {
                    "user_id": user.id,
                    "dev_otp": otp,
                }
            },
            status=status.HTTP_201_CREATED
        )


class SecurityRegisterView(generics.CreateAPIView):
    serializer_class = SecurityRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        otp = generate_and_send_otp(user)
        return Response(
            {
                "success": True,
                "message": "Registered. OTP sent for verification.",
                "data": {
                    "user_id": user.id,
                    "dev_otp": otp,
                }
            },
            status=status.HTTP_201_CREATED
        )






User = get_user_model()

class VerifyOTPView(generics.GenericAPIView):
    serializer_class = OTPVerifySerializer

    def post(self, request, *args, **kwargs):
        print("VERIFY DATA:", request.data)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_id = serializer.validated_data['user_id']
        otp_code = serializer.validated_data['otp_code']

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        otp_entry = OTPVerification.objects.filter(
            user=user, otp_code=otp_code, is_used=False
        ).order_by('-created_at').first()

        if not otp_entry:
            return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)

        # Check OTP expiry — reject if older than 10 minutes
        if timezone.now() - otp_entry.created_at > timedelta(minutes=10):
            otp_entry.is_used = True  # mark as consumed so it can't be retried
            otp_entry.save()
            return Response({"error": "OTP expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)

        otp_entry.is_used = True
        otp_entry.save()

        # Role ke hisaab se profile verify karo
        if hasattr(user, 'resident_profile'):
            user.resident_profile.is_verified = True
            user.resident_profile.save()
        elif hasattr(user, 'guardian_profile'):
            user.guardian_profile.is_verified = True
            user.guardian_profile.save()
        elif hasattr(user, 'volunteer_profile'):
            user.volunteer_profile.is_verified = True
            user.volunteer_profile.save()
        elif hasattr(user, 'security_profile'):
            user.security_profile.is_verified = True
            user.security_profile.save()

        return Response(
    {
        "success": True,
        "message": "OTP verified successfully"
    },
    status=status.HTTP_200_OK
)

    




# ---------- Day 5: Resident Mapping, Approval & Directory Views ----------

from rest_framework.permissions import IsAuthenticated
from .serializers import ResidentMappingSerializer, ResidentDirectorySerializer, ResidentApprovalSerializer
from .permissions import IsAdmin  # already Day 2 mein bana hoga


from rest_framework.parsers import MultiPartParser, FormParser, JSONParser


class ResidentMappingView(generics.UpdateAPIView):
    """Resident apne aap ko ek flat se map karta hai (onboarding ke time) and uploads documents"""
    serializer_class = ResidentMappingSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    from .models import ResidentProfile

    def get_object(self):
        if self.request.user.role != "RESIDENT":
            raise PermissionDenied("Only residents can map flats")

        profile, _ = ResidentProfile.objects.get_or_create(
            user=self.request.user,
            defaults={
                "flat_number": "",
                "approval_status": "pending"
            }
        )

        return profile

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Handle uploaded document files
        if 'aadhaar_card' in request.FILES:
            instance.aadhaar_card = request.FILES['aadhaar_card']
        if 'address_proof' in request.FILES:
            instance.address_proof = request.FILES['address_proof']
        
        instance.approval_status = 'pending'
        instance.save()

        return Response({"message": "Flat mapped & documents uploaded successfully. Awaiting admin approval."}, status=status.HTTP_200_OK)



class ResidentDirectoryView(generics.ListAPIView):
    """Admin/Security ke liye — saare residents ki list, search ke saath"""
    serializer_class = ResidentDirectorySerializer
    permission_classes = [
    IsAuthenticated,
    IsAdminOrSecurity
]

    def get_queryset(self):
        queryset = ResidentProfile.objects.select_related('user', 'flat', 'flat__block', 'flat__block__society').all()
        search = self.request.query_params.get('search')
        status_filter = self.request.query_params.get('status')

        if search:
            queryset = queryset.filter(
                models.Q(user__first_name__icontains=search) |
                models.Q(user__last_name__icontains=search) |
                models.Q(user__email__icontains=search) |
                models.Q(flat__flat_number__icontains=search)
            )
        if status_filter:
            queryset = queryset.filter(approval_status=status_filter)

        return queryset


from .permissions import IsAdmin, IsAdminOrSecurity  # update this import line

class ResidentApprovalView(generics.UpdateAPIView):
    """Admin/Security resident ko approve/reject karta hai"""
    queryset = ResidentProfile.objects.all()
    serializer_class = ResidentApprovalSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSecurity]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": f"Resident {serializer.data['approval_status']}"}, status=status.HTTP_200_OK)
    






class AdminResidentMappingView(generics.UpdateAPIView):
    """Admin kisi bhi resident ko manually flat se map kar sakta hai"""
    queryset = ResidentProfile.objects.all()
    serializer_class = ResidentMappingSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSecurity]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Resident mapped successfully"}, status=status.HTTP_200_OK)    
    





class ResidentStatusView(generics.RetrieveAPIView):
    """Logged-in resident apna current approval/mapping status check kare"""
    serializer_class = ResidentDirectorySerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user.resident_profile
    


class VolunteerAvailabilityView(generics.UpdateAPIView):
    serializer_class = VolunteerAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def update(self, request, *args, **kwargs):
        if request.user.role != "VOLUNTEER":
            return Response({"error": "Only volunteers can update availability"}, status=status.HTTP_403_FORBIDDEN)

        status_val = request.data.get('availability_status')
        if not status_val:
            status_val = request.data.get('status')

        if not status_val or status_val not in ['online', 'offline']:
            return Response({"error": "Invalid status value"}, status=status.HTTP_400_BAD_REQUEST)

        # Update VolunteerAvailability
        from sos.models import VolunteerAvailability
        availability, created = VolunteerAvailability.objects.get_or_create(
            user=request.user,
            defaults={'status': 'offline'}
        )
        availability.status = status_val
        if status_val == 'online':
            availability.lat = request.data.get('lat')
            availability.lng = request.data.get('lng')
        else:
            availability.lat = None
            availability.lng = None
        availability.save()

        # Update VolunteerProfile
        profile = request.user.volunteer_profile
        profile.availability_status = status_val
        profile.save()

        return Response({"message": f"Status updated to {status_val}"}, status=status.HTTP_200_OK)


class VolunteerAvailabilityUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "VOLUNTEER":
            return Response({"error": "Only volunteers can access availability"}, status=status.HTTP_403_FORBIDDEN)

        from sos.models import VolunteerAvailability
        availability, created = VolunteerAvailability.objects.get_or_create(
            user=request.user,
            defaults={'status': 'offline'}
        )
        return Response({
            "status": availability.status,
            "lat": availability.lat,
            "lng": availability.lng,
            "updated_at": availability.updated_at
        }, status=status.HTTP_200_OK)

    def post(self, request):
        if request.user.role != "VOLUNTEER":
            return Response({"error": "Only volunteers can update availability"}, status=status.HTTP_403_FORBIDDEN)

        status_val = request.data.get('status')
        lat_val = request.data.get('lat')
        lng_val = request.data.get('lng')

        if not status_val or status_val not in ['online', 'offline']:
            return Response({"error": "Invalid status value"}, status=status.HTTP_400_BAD_REQUEST)

        from sos.models import VolunteerAvailability
        availability, created = VolunteerAvailability.objects.get_or_create(
            user=request.user,
            defaults={'status': 'offline'}
        )

        availability.status = status_val
        if status_val == 'online':
            availability.lat = lat_val
            availability.lng = lng_val
        else:
            availability.lat = None
            availability.lng = None
        availability.save()

        # Keep VolunteerProfile.availability_status in sync!
        try:
            profile = request.user.volunteer_profile
            profile.availability_status = status_val
            profile.save()
        except Exception:
            pass

        return Response({
            "message": f"Availability updated to {status_val}",
            "status": availability.status,
            "lat": availability.lat,
            "lng": availability.lng
        }, status=status.HTTP_200_OK)


class NearbyVolunteersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = request.query_params.get('radius', 2.0)

        if not lat or not lng:
            return Response({"error": "lat and lng query parameters are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            lat = float(lat)
            lng = float(lng)
            radius = float(radius)
        except ValueError:
            return Response({"error": "Invalid lat, lng or radius format"}, status=status.HTTP_400_BAD_REQUEST)

        from sos.models import VolunteerAvailability
        online_volunteers = VolunteerAvailability.objects.filter(status='online')
        nearby = []

        from sos.views import calculate_haversine_distance

        for vol in online_volunteers:
            dist = calculate_haversine_distance(lat, lng, vol.lat, vol.lng)
            if dist <= radius:
                nearby.append({
                    "id": vol.user.id,
                    "first_name": vol.user.first_name,
                    "last_name": vol.user.last_name,
                    "phone_number": vol.user.phone_number,
                    "email": vol.user.email,
                    "distance_km": round(dist, 2),
                    "lat": vol.lat,
                    "lng": vol.lng
                })

        nearby.sort(key=lambda x: x["distance_km"])

        return Response(nearby, status=status.HTTP_200_OK)
    




from .serializers import ResendOTPSerializer
from .utils import generate_and_send_otp

class ResendOTPView(generics.GenericAPIView):
    serializer_class = ResendOTPSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_id = serializer.validated_data['user_id']

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        otp = generate_and_send_otp(user)
        return Response({"message": "OTP resent successfully", "dev_otp": otp}, status=status.HTTP_200_OK)    
    



from .serializers import ContactDirectorySerializer

from django.db import models

class ContactDirectoryView(generics.ListAPIView):
    """Guardians/Volunteers/Security ki searchable directory"""
    serializer_class = ContactDirectorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = User.objects.filter(
            role__in=['GUARDIAN', 'VOLUNTEER', 'SECURITY'], is_active=True
        ).order_by('role', 'first_name')

        search = self.request.query_params.get('search')
        role_filter = self.request.query_params.get('role')

        if search:
            queryset = queryset.filter(
                models.Q(first_name__icontains=search) | models.Q(last_name__icontains=search)
            )
        if role_filter:
            queryset = queryset.filter(role=role_filter)

        return queryset

