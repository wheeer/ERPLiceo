from django.urls import path
from . import views

urlpatterns = [
    path('calcular/', views.calcular_remuneraciones, name='calcular_remuneraciones'),
    path('pdf/<str:id>/', views.obtener_pdf_liquidacion, name='obtener_pdf_liquidacion'),
    path('lote/pagar/', views.procesar_pagos_lote, name='procesar_pagos_lote'),
    path('lote/impago/', views.declarar_impagos_lote, name='declarar_impagos_lote'),
    path('empleado/<str:rut>/<int:mes>/<int:anio>/', views.obtener_liquidacion_empleado, name='obtener_liquidacion_empleado'),
    path('', views.obtener_remuneraciones, name='obtener_remuneraciones_rango'),
    path('<int:mes>/<int:anio>/', views.obtener_remuneraciones, name='obtener_remuneraciones'),
    # Horas extra relacionadas a remuneraciones
    path('horas-extra/<int:mes>/<int:anio>/', views.obtener_horas_extra, name='obtener_horas_extra'),
]
