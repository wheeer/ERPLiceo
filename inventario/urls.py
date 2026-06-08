from django.urls import path
from . import views

urlpatterns = [
    path('', views.inventario_lista, name='inventario_lista'),
    path('criticos/', views.inventario_criticos, name='inventario_criticos'),
    path('poco-stock/', views.inventario_poco_stock, name='inventario_poco_stock'),
    path('<str:codigo>/', views.inventario_detalle, name='inventario_detalle'),
]
