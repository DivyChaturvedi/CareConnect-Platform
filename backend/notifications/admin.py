from django.contrib import admin

from .models import (
    InAppNotification,
    NotificationDeliveryLog,
    NotificationTemplate,
)

admin.site.register(InAppNotification)
admin.site.register(NotificationDeliveryLog)
admin.site.register(NotificationTemplate)