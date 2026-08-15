from rest_framework import serializers
from .models import EmergencyContact

class EmergencyContactSerializer(serializers.ModelSerializer):
    resident = serializers.HiddenField(default=serializers.CurrentUserDefault())
    is_verified = serializers.BooleanField(read_only=True)

    class Meta:
        model = EmergencyContact
        fields = [
            "id",
            "resident",
            "name",
            "phone_number",
            "relationship",
            "email",
            "is_primary_guardian",
            "is_secondary_guardian",
            "is_verified"
        ]

    def validate(self, attrs):
        # We can extract resident from validation attributes or request context
        request = self.context.get("request")
        resident = attrs.get("resident")
        if not resident and request:
            resident = request.user
            
        phone_number = attrs.get("phone_number")

        if resident:
            if resident.phone_number == phone_number:
                raise serializers.ValidationError(
                    {"phone_number": "You cannot add yourself as an emergency contact."}
                )
            if resident.role != "RESIDENT":
                raise serializers.ValidationError(
                    "Only residents can configure emergency contacts."
                )

        return attrs


class VerifyContactOTPSerializer(serializers.Serializer):
    otp_code = serializers.CharField(max_length=6, min_length=6)
