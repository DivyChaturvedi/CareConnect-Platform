"""
Production settings — used when deploying.
Run: gunicorn config.wsgi --env DJANGO_SETTINGS_MODULE=config.settings.prod
Set all env vars (SECRET_KEY, DB_*, etc.) in your server / .env file.
"""

import os
from .base import *  # noqa

# ---------------------------------------------------------------------------
# Security (strict for production)
# ---------------------------------------------------------------------------

SECRET_KEY = os.environ['DJANGO_SECRET_KEY']  # must be set in environment

DEBUG = False

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')


# ---------------------------------------------------------------------------
# Database — read from environment variables
# ---------------------------------------------------------------------------

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ['DB_NAME'],
        'USER': os.environ['DB_USER'],
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}


# ---------------------------------------------------------------------------
# CORS — only allow your real frontend domain
# ---------------------------------------------------------------------------

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')


# ---------------------------------------------------------------------------
# Security headers
# ---------------------------------------------------------------------------

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
