"""
Development settings — used locally.
Run: python manage.py runserver --settings=config.settings.dev
  OR set DJANGO_SETTINGS_MODULE=config.settings.dev in your .env
"""

import os
from .base import *  # noqa
from decouple import config

# ---------------------------------------------------------------------------
# Security (relaxed for local dev)
# ---------------------------------------------------------------------------

SECRET_KEY = config('DJANGO_SECRET_KEY', default='django-insecure-kk%zqx^z(x*xi%rae%^6wcul#=g+9))b^=n!0xa3161a)u!fcm')

DEBUG = config('DJANGO_DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = ['*']


# ---------------------------------------------------------------------------
# Database — PostgreSQL (with DATABASE_URL & Cloud SQLite fallback)
# ---------------------------------------------------------------------------

DATABASE_URL = os.environ.get('DATABASE_URL') or config('DATABASE_URL', default='')
DB_HOST = os.environ.get('DB_HOST') or config('DB_HOST', default='localhost')
USE_SQLITE = config('USE_SQLITE', default=False, cast=bool)

if DATABASE_URL:
    import urllib.parse
    urllib.parse.uses_netloc.append("postgres")
    urllib.parse.uses_netloc.append("postgresql")
    url = urllib.parse.urlparse(DATABASE_URL)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': url.path[1:],
            'USER': url.username,
            'PASSWORD': url.password,
            'HOST': url.hostname,
            'PORT': url.port or 5432,
        }
    }
elif USE_SQLITE or (os.environ.get('RENDER') and DB_HOST == 'localhost'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='careconnect_db'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default='2580'),
            'HOST': DB_HOST,
            'PORT': config('DB_PORT', default='5432'),
        }
    }


# ---------------------------------------------------------------------------
# CORS — allow all origins in dev
# ---------------------------------------------------------------------------

CORS_ALLOW_ALL_ORIGINS = True

CSRF_TRUSTED_ORIGINS = [
    'https://*.onrender.com',
    'https://*.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:8000',
]


# Real email configuration (read from .env)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='careconnectcommunity76@gmail.com')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='CareConnect <careconnectcommunity76@gmail.com>')
EMAIL_TIMEOUT = 3


# Celery Configuration (read from .env)
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'



INSTALLED_APPS += ['channels']

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}