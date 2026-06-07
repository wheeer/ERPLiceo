from django.urls import path
from . import views

urlpatterns = [
    # Autenticación y Estado
    path('status/', views.status_check, name='status_check'),
    path('login/', views.login_view, name='login_view'),
    path('cambiar-clave/', views.cambiar_clave_view, name='cambiar_clave_view'),
    
    # Remuneraciones
    path('remuneraciones/calcular/', views.calcular_remuneraciones, name='calcular_remuneraciones'),
    path('remuneraciones/pdf/<str:id>/', views.obtener_pdf_liquidacion, name='obtener_pdf_liquidacion'),
    path('remuneraciones/empleado/<str:rut>/<int:mes>/<int:anio>/', views.obtener_liquidacion_empleado, name='obtener_liquidacion_empleado'),
    path('remuneraciones/', views.obtener_remuneraciones, name='obtener_remuneraciones_rango'),
    path('remuneraciones/<int:mes>/<int:anio>/', views.obtener_remuneraciones, name='obtener_remuneraciones'),
    
    # Horas Extra
    path('horas-extra/<int:mes>/<int:anio>/', views.obtener_horas_extra, name='obtener_horas_extra'),
    
    # Inventario
    path('inventario/', views.inventario_lista, name='inventario_lista'),
    path('inventario/criticos/', views.inventario_criticos, name='inventario_criticos'),
    path('inventario/<str:codigo>/', views.inventario_detalle, name='inventario_detalle'),

    # Recursos Humanos (Nuevos Endpoints DRF - Issue #17)
    path('empleados/', views.api_empleados, name='api_empleados'),
    path('empleados/<str:rut>/', views.api_empleado_detalle, name='api_empleado_detalle'),
    path('asistencia/estado-hoy/', views.api_asistencia_estado_hoy, name='api_asistencia_estado_hoy'),
    path('asistencia/sellar/', views.api_asistencia_sellar, name='api_asistencia_sellar'),
    path('asistencia/', views.api_asistencia, name='api_asistencia_post'),
    path('asistencia/<int:mes>/<int:anio>/', views.api_asistencia, name='api_asistencia'),
    path('asistencia/resumen/', views.api_asistencia_resumen, name='api_asistencia_resumen_rango'),
    path('asistencia/resumen/<int:mes>/<int:anio>/', views.api_asistencia_resumen, name='api_asistencia_resumen'),
    path('horas-extra/', views.api_horas_extra, name='api_horas_extra_post'),
    path('horas-extra/<int:mes>/<int:anio>/', views.api_horas_extra, name='api_horas_extra'),
    
    # Dashboard
    path('dashboard/resumen/', views.api_dashboard_resumen, name='api_dashboard_resumen'),
    path('dashboard/actividades/', views.api_dashboard_actividades, name='api_dashboard_actividades'),
]