import json
from django.test import Client
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.db_connection import col_usuarios
import jwt
from django.conf import settings

def run_tests():
    print("Iniciando pruebas de API...")
    
    # Crear cliente de prueba de Django
    client = Client()
    
    # Obtener un usuario real para simular el JWT
    user = col_usuarios.find_one()
    if not user:
        print("No hay usuarios en la base de datos para generar token.")
        return
        
    print(f"Generando token para usuario: {user.get('email', 'admin')}")
    
    payload = {
        "user_id": str(user["_id"]),
        "email": user.get("email"),
        "rol": user.get("rol", "admin")
    }
    
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"}
    
    print("\n--- PRUEBA 1: GET /api/empleados/ ---")
    response = client.get('/api/empleados/', HTTP_HOST='localhost', **headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Success: {data.get('success')}")
        print(f"Empleados retornados: {len(data.get('data', []))}")
        if len(data.get('data', [])) > 0:
            print(f"Ejemplo 1er empleado: {data['data'][0].get('nombre_completo')} - RUT: {data['data'][0].get('rut')}")
    else:
        print(response.content)
        data = {"data": [{"rut": "11111111-1"}]} # fallback
        
    print("\n--- PRUEBA 2: POST /api/asistencia/ (Éxito) ---")
    asistencia_data = {
        "empleado_rut": data['data'][0]['rut'] if data.get('data') else "11111111-1",
        "fecha": "2026-05-29",
        "estado": "Presente",
        "horas_extra": 2
    }
    response = client.post('/api/asistencia/', data=json.dumps(asistencia_data), content_type='application/json', HTTP_HOST='localhost', **headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code in [200, 201]:
        print(f"Respuesta: {json.dumps(response.json(), indent=2)}")
    else:
        print(response.content)

    print("\n--- PRUEBA 3: POST /api/asistencia/ (Falla por Límite de Horas Extra) ---")
    asistencia_data_fail = {
        "empleado_rut": data['data'][0]['rut'] if data.get('data') else "11111111-1",
        "fecha": "2026-05-29",
        "estado": "Presente",
        "horas_extra": 3
    }
    response = client.post('/api/asistencia/', data=json.dumps(asistencia_data_fail), content_type='application/json', HTTP_HOST='localhost', **headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code in [200, 201, 400]:
        print(f"Respuesta: {json.dumps(response.json(), indent=2)}")
    else:
        print(response.content)

if __name__ == '__main__':
    run_tests()
