from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, ProfileView, LogoutView, AdminDashboardView,
    ResidentRegisterView, GuardianRegisterView, VolunteerRegisterView, SecurityRegisterView,
    VerifyOTPView, ResidentMappingView, ResidentDirectoryView, ResidentApprovalView,
    ResidentStatusView, AdminResidentMappingView, VolunteerAvailabilityView,
    VolunteerAvailabilityUpdateView, NearbyVolunteersView,ResendOTPView
)
from sos.views import BroadcastListCreateView, BroadcastDetailView, BroadcastRecipientListView, IncidentVisibilityView


from .views import ContactDirectoryView
urlpatterns = [
    # Auth
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),  # single refresh URL
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),

    # Admin
    path('admin-dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),

    # Role-based registration
    path('register/resident/', ResidentRegisterView.as_view(), name='register-resident'),
    path('register/guardian/', GuardianRegisterView.as_view(), name='register-guardian'),
    path('register/volunteer/', VolunteerRegisterView.as_view(), name='register-volunteer'),
    path('register/security/', SecurityRegisterView.as_view(), name='register-security'),

    # OTP
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),

    # Resident mapping & directory
    path('resident/map-flat/', ResidentMappingView.as_view(), name='resident-map-flat'),
    path('resident/directory/', ResidentDirectoryView.as_view(), name='resident-directory'),
    path('resident/status/', ResidentStatusView.as_view(), name='resident-status'),
    path('resident/<int:pk>/approve/', ResidentApprovalView.as_view(), name='resident-approve'),
    path('resident/<int:pk>/map-flat/', AdminResidentMappingView.as_view(), name='admin-resident-map-flat'),
    
    # Volunteer Availability & Location Tracking
    path('volunteer/availability/', VolunteerAvailabilityView.as_view()),
    path('volunteers/availability/', VolunteerAvailabilityUpdateView.as_view(), name='volunteers-availability-update'),
    path('volunteers/nearby/', NearbyVolunteersView.as_view(), name='volunteers-nearby'),
    
    # Broadcast & Incident Visibility Config
    path('broadcasts/', BroadcastListCreateView.as_view(), name='broadcast-list-create'),
    path('broadcasts/<int:pk>/', BroadcastDetailView.as_view(), name='broadcast-detail'),
    path('broadcasts/<int:pk>/recipients/', BroadcastRecipientListView.as_view(), name='broadcast-recipients'),
    path('incidents/<int:pk>/visibility/', IncidentVisibilityView.as_view(), name='incident-visibility'),
    path('resend-otp/', ResendOTPView.as_view()),
    path('contacts/directory/', ContactDirectoryView.as_view()),
]