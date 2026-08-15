from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from .models import ResidentProfile, GuardianProfile, VolunteerProfile, SecurityProfile
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


from django.contrib.auth.password_validation import validate_password

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password]
    )

    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "role",
            "password",
        )

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "role",
            "created_at",
        )


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def save(self):
        refresh_token = self.validated_data["refresh"]
        token = RefreshToken(refresh_token)
        token.blacklist()


# ---------- Day 3: Role-based Registration Serializers ----------
class BaseRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password]
    )

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'phone_number', 'password', 'role']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ResidentRegistrationSerializer(BaseRegistrationSerializer):
    flat_number = serializers.CharField(write_only=True)
    block_tower = serializers.CharField(write_only=True, required=False)

    class Meta(BaseRegistrationSerializer.Meta):
        fields = BaseRegistrationSerializer.Meta.fields + ['flat_number', 'block_tower']

    def create(self, validated_data):
        flat_number = validated_data.pop('flat_number')
        block_tower = validated_data.pop('block_tower', None)
        validated_data['role'] = 'RESIDENT'
        user = super().create(validated_data)
        ResidentProfile.objects.create(user=user, flat_number=flat_number, block_tower=block_tower)
        return user


class GuardianRegistrationSerializer(BaseRegistrationSerializer):
    relation_to_resident = serializers.CharField(write_only=True)
    linked_resident_phone = serializers.CharField(write_only=True, required=False)

    class Meta(BaseRegistrationSerializer.Meta):
        fields = BaseRegistrationSerializer.Meta.fields + ['relation_to_resident', 'linked_resident_phone']

    def create(self, validated_data):
        relation = validated_data.pop('relation_to_resident')
        linked_phone = validated_data.pop('linked_resident_phone', None)
        validated_data['role'] = 'GUARDIAN'
        user = super().create(validated_data)
        GuardianProfile.objects.create(user=user, relation_to_resident=relation, linked_resident_phone=linked_phone)
        return user


class VolunteerRegistrationSerializer(BaseRegistrationSerializer):
    area_of_service = serializers.CharField(write_only=True, required=False)

    class Meta(BaseRegistrationSerializer.Meta):
        fields = BaseRegistrationSerializer.Meta.fields + ['area_of_service']

    def create(self, validated_data):
        area = validated_data.pop('area_of_service', None)
        validated_data['role'] = 'VOLUNTEER'
        user = super().create(validated_data)
        VolunteerProfile.objects.create(user=user, area_of_service=area)
        from sos.models import VolunteerAvailability
        VolunteerAvailability.objects.get_or_create(user=user, defaults={'status': 'offline'})
        return user


class SecurityRegistrationSerializer(BaseRegistrationSerializer):
    shift_start = serializers.TimeField(write_only=True)
    shift_end = serializers.TimeField(write_only=True)
    guard_id = serializers.CharField(write_only=True)

    class Meta(BaseRegistrationSerializer.Meta):
        fields = BaseRegistrationSerializer.Meta.fields + ['shift_start', 'shift_end', 'guard_id']

    def create(self, validated_data):
        shift_start = validated_data.pop('shift_start')
        shift_end = validated_data.pop('shift_end')
        guard_id = validated_data.pop('guard_id')
        validated_data['role'] = 'SECURITY'
        user = super().create(validated_data)
        SecurityProfile.objects.create(user=user, shift_start=shift_start, shift_end=shift_end, guard_id=guard_id)
        from sos.models import SecurityStaff
        SecurityStaff.objects.get_or_create(user=user, defaults={'is_active': True})
        return user


# ---------- Day 3: OTP Verification Serializer ----------

class OTPVerifySerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    otp_code = serializers.CharField(max_length=6)







    # ---------- Day 5: Resident Mapping & Directory Serializers ----------

from society.models import Flat, Block, Society

class ResidentMappingSerializer(serializers.ModelSerializer):
    flat_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ResidentProfile
        fields = ['flat_id']

    def validate_flat_id(self, value):
        if not Flat.objects.filter(id=value).exists():
            raise serializers.ValidationError("Flat does not exist")
        return value

    def update(self, instance, validated_data):
        flat_id = validated_data.pop('flat_id')
        flat = Flat.objects.get(id=flat_id)
        instance.flat = flat
        instance.approval_status = 'pending'  # mapping ke baad dobara approval chahiye
        instance.save()
        return instance


class ResidentDirectorySerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)
    flat_number = serializers.CharField(source='flat.flat_number', read_only=True, default=None)
    floor = serializers.IntegerField(source='flat.floor', read_only=True, default=None)
    block_name = serializers.CharField(source='flat.block.name', read_only=True, default=None)
    society_name_actual = serializers.CharField(source='flat.block.society.name', read_only=True, default=None)
    aadhaar_card_url = serializers.SerializerMethodField()
    address_proof_url = serializers.SerializerMethodField()

    class Meta:
        model = ResidentProfile
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone_number',
            'flat_number', 'floor', 'block_name', 'society_name_actual',
            'approval_status', 'is_verified', 'aadhaar_card', 'address_proof',
            'aadhaar_card_url', 'address_proof_url', 'requested_at',
        ]

    def get_aadhaar_card_url(self, obj):
        request = self.context.get('request')
        if obj.aadhaar_card and hasattr(obj.aadhaar_card, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.aadhaar_card.url)
            return obj.aadhaar_card.url
        return None

    def get_address_proof_url(self, obj):
        request = self.context.get('request')
        if obj.address_proof and hasattr(obj.address_proof, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.address_proof.url)
            return obj.address_proof.url
        return None


class ResidentApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResidentProfile
        fields = ['approval_status']

    def validate_approval_status(self, value):
        if value not in ['pending', 'approved', 'rejected']:
            raise serializers.ValidationError("Invalid status")
        return value
      






class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['role'] = self.user.role
        data['user_id'] = self.user.id

        if hasattr(self.user, 'resident_profile'):
            profile = self.user.resident_profile
            data['is_mapped'] = profile.flat is not None
            data['approval_status'] = profile.approval_status
        else:
            data['is_mapped'] = None
            data['approval_status'] = None

        return data
    





class VolunteerAvailabilitySerializer(serializers.Serializer):
    availability_status = serializers.ChoiceField(choices=['online', 'offline'])   



class ResendOTPSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()     






class ContactDirectorySerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'full_name', 'role', 'phone_number']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()