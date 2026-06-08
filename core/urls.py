from django.urls import path
from . import views

urlpatterns = [
    # Autenticación y Estado
    path('status/', views.status_check, name='status_check'),
    path('login/', views.login_view, name='login_view'),
    path('refresh-token/', views.refresh_token_view, name='refresh_token_view'),
    path('cambiar-clave/', views.cambiar_clave_view, name='cambiar_clave_view'),
    
    # Dashboard
    path('dashboard/resumen/', views.api_dashboard_resumen, name='api_dashboard_resumen'),
    path('dashboard/actividades/', views.api_dashboard_actividades, name='api_dashboard_actividades'),

    # Notificaciones
    path('notificaciones/', views.api_notificaciones, name='api_notificaciones'),
    path('notificaciones/<str:notif_id>/', views.api_notificacion_estado, name='api_notificacion_estado'),
]