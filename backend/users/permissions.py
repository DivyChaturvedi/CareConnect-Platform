from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):

    def has_permission(self, request, view):
        return (
            bool(request.user and request.user.is_authenticated)
            and getattr(request.user, "role", None) == "ADMIN"
        )


class IsResident(BasePermission):

    def has_permission(self, request, view):
        return (
            bool(request.user and request.user.is_authenticated)
            and getattr(request.user, "role", None) == "RESIDENT"
        )


class IsGuardian(BasePermission):

    def has_permission(self, request, view):
        return (
            bool(request.user and request.user.is_authenticated)
            and getattr(request.user, "role", None) == "GUARDIAN"
        )


class IsVolunteer(BasePermission):

    def has_permission(self, request, view):
        return (
            bool(request.user and request.user.is_authenticated)
            and getattr(request.user, "role", None) == "VOLUNTEER"
        )


class IsSecurity(BasePermission):

    def has_permission(self, request, view):
        return (
            bool(request.user and request.user.is_authenticated)
            and getattr(request.user, "role", None) == "SECURITY"
        )


class IsAdminOrSecurity(BasePermission):

    def has_permission(self, request, view):
        return (
            bool(request.user and request.user.is_authenticated)
            and getattr(request.user, "role", None) in ["ADMIN", "SECURITY"]
        )