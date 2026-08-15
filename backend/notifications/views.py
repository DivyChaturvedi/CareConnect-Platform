from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import NotificationTemplate, InAppNotification
from .serializers import (
    NotificationTemplateSerializer,
    InAppNotificationSerializer,
)

from users.permissions import IsAdmin


class NotificationTemplateListCreateView(generics.ListCreateAPIView):
    """
    Admin templates list/create kar sakta hai
    """
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class NotificationTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Admin template retrieve/update/delete kar sakta hai
    """
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class MyNotificationsView(generics.ListAPIView):
    serializer_class = InAppNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return InAppNotification.objects.none()

        return InAppNotification.objects.filter(
            recipient=self.request.user
        )


from .serializers import InAppNotificationSerializer

from rest_framework import serializers

class NotifEmptySerializer(serializers.Serializer):
    pass

class MarkNotificationReadView(generics.UpdateAPIView):
    serializer_class = InAppNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return InAppNotification.objects.none()

        return InAppNotification.objects.filter(
            recipient=self.request.user
        )

    def update(self, request, *args, **kwargs):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(
            {"message": "Notification marked as read"},
            status=status.HTTP_200_OK,
        )


class MarkAllNotificationsReadView(generics.GenericAPIView):
    serializer_class = NotifEmptySerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        updated = InAppNotification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response(
            {"message": f"{updated} notifications marked as read"},
            status=status.HTTP_200_OK,
        )


class UnreadNotificationCountView(generics.GenericAPIView):
    serializer_class = NotifEmptySerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        count = InAppNotification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)
    


from .models import DeviceToken

from rest_framework import serializers

class DeviceTokenInputSerializer(serializers.Serializer):
    token = serializers.CharField()
    device_type = serializers.ChoiceField(choices=['android', 'ios'], default='android')


class RegisterDeviceTokenView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DeviceTokenInputSerializer

    def post(self, request, *args, **kwargs):
        token = request.data.get('token')
        device_type = request.data.get('device_type', 'android')
        if not token:
            return Response({"error": "Token is required"}, status=status.HTTP_400_BAD_REQUEST)
        DeviceToken.objects.update_or_create(token=token, defaults={'user': request.user, 'device_type': device_type})
        return Response({"message": "Device token registered"}, status=status.HTTP_201_CREATED)