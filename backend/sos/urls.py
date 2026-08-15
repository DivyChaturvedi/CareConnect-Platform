from django.urls import path

from .views import (
    EmergencyCategoryListView,
    SOSAlertCreateView,
    MySOSAlertsView,
    SOSAlertUpdateView,
    RespondToSOSView,
    SOSAlertGuardianDetailView,
    EscalationConfigView,
    EscalationLogListView,
)
from .views import AlertMonitoringListView, DashboardStatsView

from .views import AcceptIncidentView
from .views import SOSAlertRetrieveView

from .views import UpdateIncidentStatusView

from .views import ChatHistoryView

from .views import ResponseUpdatesListView
from .views import (
    IncidentTransitionsView,
    IncidentClosureView,
    IncidentAttachmentsView,
    IncidentTimelineView,
    IncidentStatusPostView,
)

from .views import ChatParticipantsView, ChatImageUploadView


from .views import SecurityDashboardView, SecurityReportSummaryView

from .views import ReportSummaryView, ExportExcelReportView, ExportPdfReportView

urlpatterns = [
    # Security Staff Dashboard APIs (Day 18)
    path('security/dashboard/', SecurityDashboardView.as_view(), name='security-dashboard'),
    path('security/summary/', SecurityReportSummaryView.as_view(), name='security-summary'),

    # Emergency categories (master data)
    path('categories/', EmergencyCategoryListView.as_view(), name='sos-categories'),

    # SOS alert lifecycle
    path('trigger/', SOSAlertCreateView.as_view(), name='sos-trigger'),
    path('my-alerts/', MySOSAlertsView.as_view(), name='sos-my-alerts'),
    path('<int:pk>/update/', SOSAlertUpdateView.as_view(), name='sos-update'),
    path('<int:pk>/respond/', RespondToSOSView.as_view(), name='sos-respond'),
    path('<int:pk>/detail/', SOSAlertGuardianDetailView.as_view(), name='sos-detail'),

    # Escalation & Monitoring
    path('escalation-config/', EscalationConfigView.as_view(), name='sos-escalation-config'),
    path('escalation-logs/', EscalationLogListView.as_view(), name='sos-escalation-logs'),
    path('monitoring/alerts/', AlertMonitoringListView.as_view()),
    path('monitoring/stats/', DashboardStatsView.as_view()),
    path('<int:pk>/accept/', AcceptIncidentView.as_view()),
    path('<int:pk>/', SOSAlertRetrieveView.as_view()),
    path('<int:pk>/update-status/', UpdateIncidentStatusView.as_view()),
    path('<int:pk>/chat/', ChatHistoryView.as_view()),
    path('<int:pk>/updates/', ResponseUpdatesListView.as_view()),

    # Incident Key APIs (Day 16 spec: /api/incidents/...)
    path('', AlertMonitoringListView.as_view(), name='incident-list'),
    path('<int:pk>/status', IncidentStatusPostView.as_view(), name='incident-status-post'),
    path('<int:pk>/transitions', IncidentTransitionsView.as_view(), name='incident-transitions'),
    path('<int:pk>/closure', IncidentClosureView.as_view(), name='incident-closure'),
    path('<int:pk>/attachments', IncidentAttachmentsView.as_view(), name='incident-attachments'),
    path('<int:pk>/timeline', IncidentTimelineView.as_view(), name='incident-timeline'),
    
    path('<int:pk>/chat/participants/', ChatParticipantsView.as_view()),
    path('<int:pk>/chat/upload-image/', ChatImageUploadView.as_view()),
    

path('reports/summary/', ReportSummaryView.as_view()),
path('reports/export/excel/', ExportExcelReportView.as_view()),
path('reports/export/pdf/', ExportPdfReportView.as_view()),


]