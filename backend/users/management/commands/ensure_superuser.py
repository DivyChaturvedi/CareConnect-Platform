import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Automatically create or update a default superuser on deployment'

    def handle(self, *args, **options):
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@careconnect.com').strip()
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'Admin@12345').strip()
        first_name = os.environ.get('DJANGO_SUPERUSER_FIRST_NAME', 'Admin').strip()
        phone_number = os.environ.get('DJANGO_SUPERUSER_PHONE', '9999999999').strip()

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': first_name,
                'last_name': 'Superuser',
                'phone_number': phone_number,
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            }
        )

        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.role = 'ADMIN'
        user.is_active = True
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Superuser '{email}' created successfully."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Superuser '{email}' updated with active credentials."))
