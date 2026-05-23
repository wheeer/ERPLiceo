from django.urls import path
from . import views

urlpatterns = [
    path('status/', views.status_check, name='status_check'),
    path('login/', views.login_view, name='login_view'),
    path('cambiar-clave/', views.cambiar_clave_view, name='cambiar_clave_view'),

    # API liquidación por empleado - Jasna #

    path('remuneraciones/empleado/<str:rut>/<int:mes>/<int:anio>/', views.obtener_liquidacion_empleado, name='obtener_liquidacion_empleado'),

    # API modulo remuneraciones -Jasna #

    path('remuneraciones/<int:mes>/<int:anio>/', views.obtener_remuneraciones, name='obtener_remuneraciones'),

    # API modulo horas extra -Jasna #

    path('horas-extra/<int:mes>/<int:anio>/', views.obtener_horas_extra, name='obtener_horas_extra'),

    # API calcular remuneraciones
    path( 'remuneraciones/calcular/', views.calcular_remuneraciones, name='calcular_remuneraciones'),

    # API PDF liquidación - Jasna #

    path( 'remuneraciones/<str:id>/pdf/', views.obtener_pdf_liquidacion, name='obtener_pdf_liquidacion'),

 
]

