from django.contrib import admin
from .models import EmergencyCategory, SOSAlert

admin.site.register(EmergencyCategory)
admin.site.register(SOSAlert)