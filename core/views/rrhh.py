from django.http import JsonResponse
from core.db_connection import db # Esto asume que la conexión a Mongo se exporta así desde db_connection.py
from datetime import datetime

def lista_empleados(request):
    # 1. Seleccionamos la colección de empleados
    coleccion_empleados = db['empleados']
    
    # 2. Preparamos el filtro por si el frontend pide solo los activos (?activo=true)
    filtro = {}
    if request.GET.get('activo') == 'true':
        filtro['estado'] = 'activo'

    # 3. Buscamos en la base de datos
    empleados_db = coleccion_empleados.find(filtro)
    
    # 4. Armamos la lista con los datos exactos que pide el frontend
    datos_formateados = []
    for emp in empleados_db:
        datos_formateados.append({
            '_id': str(emp.get('_id')),
            'nombre_completo': emp.get('nombre_completo', ''),
            'rut': emp.get('rut', ''),
            'correo': emp.get('correo', 'No registrado'),
            'departamento': emp.get('departamento', 'Sin departamento'),
            'cargo': emp.get('cargo', ''),
            'tipo_contrato': emp.get('tipo_contrato', ''),
            'fecha_ingreso': emp.get('fecha_ingreso', ''),
            'estado': emp.get('estado', 'inactivo'),
            'config_remuneracion': emp.get('config_remuneracion', {})
        })

    # 5. Devolvemos los datos en formato JSON
    return JsonResponse(datos_formateados, safe=False)

def asistencia_mensual(request):
    coleccion_asistencia = db['asistencia']
    asistencia_db = coleccion_asistencia.find()
    
    datos_formateados = []
    for asis in asistencia_db:
        datos_formateados.append({
            '_id': str(asis.get('_id')),
            'empleado_rut': asis.get('empleado_rut', ''),
            'fecha': asis.get('fecha', ''),
            'hora_entrada': asis.get('hora_entrada', ''),
            'hora_salida': asis.get('hora_salida', ''),
            'estado': asis.get('estado', ''),
            'horas_trabajadas': asis.get('horas_trabajadas', 0),
            'comentario': asis.get('comentario', '')
        })
        
    return JsonResponse(datos_formateados, safe=False)
