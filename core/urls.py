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
    path('remuneraciones/<int:mes>/<int:anio>/', views.obtener_remuneraciones, name='obtener_remuneraciones'),
    
    # Horas Extra (existente de remuneraciones)
    path('horas-extra/<int:mes>/<int:anio>/', views.obtener_horas_extra, name='obtener_horas_extra'),
    
    # Inventario
    path('inventario/', views.inventario_lista, name='inventario_lista'),
    path('inventario/criticos/', views.inventario_criticos, name='inventario_criticos'),
    path('inventario/<str:codigo>/', views.inventario_detalle, name='inventario_detalle'),

    # Recursos Humanos - Empleados
    path('empleados/', views.empleados_lista, name='empleados_lista'),
    path('empleados', views.empleados_lista, name='empleados_lista_no_slash'),
    path('empleados/<str:rut>/', views.empleados_detalle, name='empleados_detalle'),
    path('empleados/<str:rut>', views.empleados_detalle, name='empleados_detalle_no_slash'),

    # Recursos Humanos - Asistencia
    path('asistencia/', views.asistencia_registro, name='asistencia_registro'),
    path('asistencia', views.asistencia_registro, name='asistencia_registro_no_slash'),
    path('asistencia/<int:mes>/<int:anio>/', views.asistencia_mensual, name='asistencia_mensual'),
    path('asistencia/<int:mes>/<int:anio>', views.asistencia_mensual, name='asistencia_mensual_no_slash'),
    path('asistencia/resumen/<int:mes>/<int:anio>/', views.asistencia_resumen, name='asistencia_resumen'),
    path('asistencia/resumen/<int:mes>/<int:anio>', views.asistencia_resumen, name='asistencia_resumen_no_slash'),

    # Recursos Humanos - Horas Extra
    path('horas-extra/', views.horas_extra_registro, name='horas_extra_registro'),
    path('horas-extra', views.horas_extra_registro, name='horas_extra_registro_no_slash'),
]