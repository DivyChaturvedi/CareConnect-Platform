from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class LoginSerializer(TokenObtainPairSerializer):
    username_field = "email"

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Extra user information inside token
        token["email"] = user.email
        token["role"] = user.role
        token["first_name"] = user.first_name

        return token
    