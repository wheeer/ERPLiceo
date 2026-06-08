from django.urls import path
from . import views

urlpatterns = [
    # Empleados
    path('empleados/', views.api_empleados, name='api_empleados'),
    path('empleados/<str:rut>/', views.api_empleado_detalle, name='api_empleado_detalle'),
    path('empleados/<str:rut>/swap/', views.api_empleado_swap, name='api_empleado_swap'),
    
    # Asistencia
    path('asistencia/estado-hoy/', views.api_asistencia_estado_hoy, name='api_asistencia_estado_hoy'),
    path('asistencia/sellar/', views.api_asistencia_sellar, name='api_asistencia_sellar'),
    path('asistencia/', views.api_asistencia, name='api_asistencia_post'),
    path('asistencia/<int:mes>/<int:anio>/', views.api_asistencia, name='api_asistencia'),
    path('asistencia/resumen/', views.api_asistencia_resumen, name='api_asistencia_resumen_rango'),
    path('asistencia/resumen/<int:mes>/<int:anio>/', views.api_asistencia_resumen, name='api_asistencia_resumen'),
    
    # Horas Extra API
    path('horas-extra/', views.api_horas_extra, name='api_horas_extra_post'),
    path('horas-extra/<int:mes>/<int:anio>/', views.api_horas_extra, name='api_horas_extra'),
]
