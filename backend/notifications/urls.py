from django.urls import path
from .views import (
    NotificationTemplateListCreateView,
    NotificationTemplateDetailView,
    MyNotificationsView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
    UnreadNotificationCountView,
)
from .views import RegisterDeviceTokenView

urlpatterns = [
    path('templates/', NotificationTemplateListCreateView.as_view()),
    path('templates/<int:pk>/', NotificationTemplateDetailView.as_view()),
    path('my-notifications/', MyNotificationsView.as_view()),
    path('<int:pk>/mark-read/', MarkNotificationReadView.as_view()),
    path('mark-all-read/', MarkAllNotificationsReadView.as_view()),
    path('unread-count/', UnreadNotificationCountView.as_view()),
    path('register-device-token/', RegisterDeviceTokenView.as_view()),
]