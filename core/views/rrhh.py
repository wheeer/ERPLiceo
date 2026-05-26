from django.http import JsonResponse
from core.db_connection import db # Esto asume que la conexión a Mongo se exporta así desde db_connection.py

def lista_empleados(request):
    # 1. Seleccionamos la colección de empleados
    coleccion_empleados = db['empleados']
    
    # 2. Preparamos el filtro por si el frontend pide solo los activos (?activo=true)
    filtro = {}
    if request.GET.get('activo') == 'true':
        filtro['activo'] = True

    # 3. Buscamos en la base de datos
    empleados_db = coleccion_empleados.find(filtro)
    
    # 4. Armamos la lista con los datos exactos que pide el frontend
    datos_formateados = []
    for emp in empleados_db:
        datos_formateados.append({
            '_id': str(emp.get('_id')),
            'nombre_completo': emp.get('nombre_completo', ''),
            'rut': emp.get('rut', ''),
            'cargo': emp.get('cargo', ''),
            'tipo_contrato': emp.get('tipo_contrato', ''),
            'fecha_ingreso': emp.get('fecha_ingreso', ''),
            'activo': emp.get('activo', False)
        })

    # 5. Devolvemos los datos en formato JSON
    return JsonResponse(datos_formateados, safe=False)# Vistas del módulo Recursos Humanos
