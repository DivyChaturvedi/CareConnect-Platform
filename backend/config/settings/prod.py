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
# Database — read from environment variables or DATABASE_URL
# ---------------------------------------------------------------------------

DATABASE_URL = os.environ.get('DATABASE_URL', '')

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
            'CONN_MAX_AGE': 60,
        }
    }
elif os.environ.get('DB_NAME'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ['DB_NAME'],
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


# ---------------------------------------------------------------------------
# CORS — only allow your real frontend domain
# ---------------------------------------------------------------------------

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', 'https://*.vercel.app,http://localhost:5173').split(',')

CSRF_TRUSTED_ORIGINS = [
    'https://*.onrender.com',
    'https://*.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:8000',
]


# ---------------------------------------------------------------------------
# Security headers
# ---------------------------------------------------------------------------

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
