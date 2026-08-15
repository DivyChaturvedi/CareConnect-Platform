from rest_framework import serializers
from .models import NotificationTemplate, InAppNotification


class NotificationTemplateSerializer(serializers.ModelSerializer):

    class Meta:
        model = NotificationTemplate
        fields = [
            "id",
            "notification_type",
            "title_template",
            "body_template",
            "is_active",
            "updated_at",
        ]


class InAppNotificationSerializer(serializers.ModelSerializer):

    class Meta:
        model = InAppNotification
        fields = [
            "id",
            "title",
            "message",
            "notification_type",
            "related_sos_id",
            "is_read",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]