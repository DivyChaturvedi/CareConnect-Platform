from rest_framework import serializers
from .models import EmergencyCategory, SOSAlert,EscalationLog,EscalationConfig


class EmergencyCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyCategory
        fields = ['id', 'name', 'icon', 'description']


class SOSAlertCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SOSAlert
        fields = ['id', 'category', 'message', 'latitude', 'longitude', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']

    def create(self, validated_data):
        validated_data['resident'] = self.context['request'].user
        return super().create(validated_data)


from .models import IncidentAttachment, ResponseUpdate
from .services import VALID_TRANSITIONS


class IncidentAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = IncidentAttachment
        fields = ['id', 'file', 'file_name', 'file_type', 'file_size', 'uploaded_by', 'uploaded_by_name', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at']

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip()
        return None


class IncidentClosureSerializer(serializers.Serializer):
    resolution_summary = serializers.CharField(required=True)
    resolution_datetime = serializers.DateTimeField(required=False)
    outcome = serializers.ChoiceField(choices=SOSAlert.OUTCOME_CHOICES, required=True)
    resolution_notes = serializers.CharField(required=False, allow_blank=True)


class SOSAlertDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    resident_name = serializers.SerializerMethodField()
    resident_phone = serializers.CharField(source='resident.phone_number', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    valid_transitions = serializers.SerializerMethodField()
    attachments = IncidentAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = SOSAlert
        fields = [
            'id', 'category', 'category_name', 'message',
            'latitude', 'longitude', 'address', 'status',
            'resident_name', 'resident_phone', 'created_at', 'updated_at',
            'assigned_to', 'assigned_to_name', 'assigned_at',
            'resolution_notes', 'resolution_summary', 'outcome', 'closed_at',
            'valid_transitions', 'attachments',
        ]

    def get_resident_name(self, obj):
        return f"{obj.resident.first_name} {obj.resident.last_name}".strip()

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()
        return None

    def get_valid_transitions(self, obj):
        return VALID_TRANSITIONS.get(obj.status, [])


class SOSAlertUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SOSAlert
        fields = ['message', 'status', 'resolution_notes', 'resolution_summary', 'outcome']
    


class EscalationConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscalationConfig
        fields = ['id', 'response_window_minutes', 'is_active', 'updated_at']



class EscalationLogSerializer(serializers.ModelSerializer):
    alert_category = serializers.CharField(source='alert.category.name', read_only=True, default=None)
    resident_name = serializers.SerializerMethodField()

    class Meta:
        model = EscalationLog
        fields = [
            'id', 'alert', 'alert_category', 'resident_name',
            'escalated_to_name', 'escalated_to_phone', 'escalated_to_email',
            'reason', 'created_at',
        ]

    def get_resident_name(self, obj):
        return f"{obj.alert.resident.first_name} {obj.alert.resident.last_name}".strip()


from .models import Broadcast, BroadcastRecipient
from users.serializers import UserProfileSerializer

class BroadcastRecipientSerializer(serializers.ModelSerializer):
    user_details = UserProfileSerializer(source='user', read_only=True)

    class Meta:
        model = BroadcastRecipient
        fields = ['id', 'broadcast', 'user', 'user_details', 'role', 'status', 'notified_at']


class BroadcastSerializer(serializers.ModelSerializer):
    incident_details = SOSAlertDetailSerializer(source='incident', read_only=True)
    recipients_count = serializers.IntegerField(source='recipients.count', read_only=True, default=0)

    class Meta:
        model = Broadcast
        fields = ['id', 'incident', 'incident_details', 'radius', 'status', 'created_at', 'recipients_count']




class SOSAlertMonitoringSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    resident_name = serializers.SerializerMethodField()
    resident_phone = serializers.CharField(source='resident.phone_number', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = SOSAlert
        fields = [
              'id', 'category', 'category_name', 'message',
            'latitude', 'longitude', 'address', 'status',
            'resident_name', 'resident_phone', 'created_at', 'updated_at',
            'assigned_to', 'assigned_to_name', 'assigned_at',
        ]

    def get_resident_name(self, obj):
        return f"{obj.resident.first_name} {obj.resident.last_name}".strip()

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()
        return None


class SOSStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=SOSAlert.STATUS_CHOICES)
    resolution_notes = serializers.CharField(required=False, allow_blank=True)
    outcome = serializers.CharField(required=False, allow_blank=True)


from .models import EmergencyCategory, SOSAlert, EscalationLog, EscalationConfig, ChatMessage
class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    message = serializers.CharField(required=False, allow_blank=True, default="")
    image_url = serializers.CharField(required=False, allow_null=True, allow_blank=True, default=None)

    class Meta:
        model = ChatMessage
        fields = ['id', 'message', 'message_type', 'image_url', 'sender', 'sender_name', 'sender_role', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']

    def get_sender_name(self, obj):
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip()

    def get_sender_role(self, obj):
        return obj.sender.role




from .models import ResponseUpdate
class ResponseUpdateSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = ResponseUpdate
        fields = ['id', 'update_type', 'description', 'actor_name', 'created_at']

    def get_actor_name(self, obj):
        if obj.actor:
            return f"{obj.actor.first_name} {obj.actor.last_name}".strip()
        return "System"


class SecurityDashboardAlertSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    resident_name = serializers.SerializerMethodField()
    resident_phone = serializers.CharField(source='resident.phone_number', read_only=True, default='')
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = SOSAlert
        fields = [
            'id', 'resident_name', 'resident_phone', 'category_name', 'status', 'address',
            'latitude', 'longitude', 'assigned_to', 'assigned_to_name', 'created_at', 'is_escalated',
        ]

    def get_resident_name(self, obj):
        if obj.resident:
            return f"{obj.resident.first_name} {obj.resident.last_name}".strip()
        return "Unknown"

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()
        return None