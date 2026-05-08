"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

# Agregamos esta línea para que Django encuentre tu receta (vista) en la carpeta core
from core import views 

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Todas las rutas de nuestro ERP empezarán con /api/
    path('api/', include('core.urls')),
    
    # ... aquí habrá otras rutas de tus compañeros ...
    # path('inventario/algo', views.otra_cosa),
    
    # --- RUTA RRHH TICKET #22 ---
    path('api/asistencia/resumen/<int:mes>/<int:anio>/', views.resumen_mensual_asistencia),
]