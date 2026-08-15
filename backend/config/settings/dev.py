"""
Development settings — used locally.
Run: python manage.py runserver --settings=config.settings.dev
  OR set DJANGO_SETTINGS_MODULE=config.settings.dev in your .env
"""

from .base import *  # noqa

from decouple import config

# ---------------------------------------------------------------------------
# Security (relaxed for local dev)
# ---------------------------------------------------------------------------

SECRET_KEY = config('DJANGO_SECRET_KEY', default='django-insecure-kk%zqx^z(x*xi%rae%^6wcul#=g+9))b^=n!0xa3161a)u!fcm')

DEBUG = config('DJANGO_DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = ['*']


# ---------------------------------------------------------------------------
# Database — local PostgreSQL
# ---------------------------------------------------------------------------

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='careconnect_db'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='2580'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}


# ---------------------------------------------------------------------------
# CORS — allow all origins in dev
# ---------------------------------------------------------------------------

CORS_ALLOW_ALL_ORIGINS = True


# Real email configuration (read from .env)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='careconnectcommunity76@gmail.com')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='CareConnect <careconnectcommunity76@gmail.com>')


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