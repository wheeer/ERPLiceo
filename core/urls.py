from django.urls import path
from . import views

urlpatterns = [
    path('status/', views.status_check, name='status_check'),
    path('login/', views.login_view, name='login_view'),
    path('cambiar-clave/', views.cambiar_clave_view, name='cambiar_clave_view'),
    
    # Módulo de Inventario
    path('inventario/criticos/', views.inventario_criticos, name='inventario_criticos'),
    path('inventario/', views.inventario_list_create, name='inventario_list_create'),
    path('inventario/<str:codigo>/', views.inventario_detail, name='inventario_detail'),
]
