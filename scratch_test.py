import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from django.test import RequestFactory
from core.views.rrhh import api_asistencia
import json

factory = RequestFactory()

data = [
    {"rut": "11111111-1", "estado": "Presente", "fecha": "2026-06-01"},
    {"rut": "22222222-2", "estado": "Ausente Injustificado", "fecha": "2026-06-01"},
    {"rut": "33333333-3", "estado": "Finde", "fecha": "2026-06-01"}
]

# Creamos una request mock
request = factory.post('/api/asistencia/', data=json.dumps(data), content_type='application/json')
# Simulamos usuario autenticado (jwt_required asume que request.user existe o algo, aunque lo ignoramos si el middleware no está)
request.user = None

try:
    response = api_asistencia(request)
    print(f"Status: {response.status_code}")
    print(f"Content: {response.content.decode('utf-8')}")
except Exception as e:
    print(f"Error testing view: {e}")
