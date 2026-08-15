# This file intentionally left empty.
# Settings are split into:
#   base.py  — shared across all environments
#   dev.py   — local development
#   prod.py  — production deployment
#
# Default: dev (so `python manage.py runserver` still works without --settings flag)
from .dev import *  # noqa
