from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAdminOrReadOnly(BasePermission):
    """
    Any authenticated user can perform safe (read) operations.
    Only users with role ADMIN can write (POST, PUT, PATCH, DELETE).
    """

    def has_permission(self, request, view):
        # Must be authenticated for all requests
        if not request.user or not request.user.is_authenticated:
            return False
        # Any authenticated user can read
        if request.method in SAFE_METHODS:
            return True
        # Only admins can write
        return request.user.role == "ADMIN"