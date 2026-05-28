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
    
    # Horas Extra
    path('horas-extra/<int:mes>/<int:anio>/', views.obtener_horas_extra, name='obtener_horas_extra'),
    
    # Inventario
    path('inventario/', views.inventario_lista, name='inventario_lista'),
    path('inventario/criticos/', views.inventario_criticos, name='inventario_criticos'),
    path('inventario/<str:codigo>/', views.inventario_detalle, name='inventario_detalle'),

    # Recursos Humanos
    path('empleados', views.lista_empleados, name='api_empleados'),
    path('asistencia/<int:mes>/<int:anio>', views.obtener_asistencia_mensual, name='asistencia_mensual'),
]