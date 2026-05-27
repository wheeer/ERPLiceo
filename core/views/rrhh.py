from django.http import JsonResponse
from core.db_connection import db # Esto asume que la conexión a Mongo se exporta así desde db_connection.py

<<<<<<< HEAD
# Vistas del módulo Recursos Humanos

=======
>>>>>>> 6f420e4afb79d51bbde3f94427245a867f275a51
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
<<<<<<< HEAD
    return JsonResponse(datos_formateados, safe=False)

def obtener_asistencia_mensual(request, empleado_id, anio, mes):
    """
    Retorna la asistencia de un empleado para un mes y año específicos.
    """
    try:
        # 1. Seleccionamos la colección de asistencia
        coleccion_asistencia = db['asistencia']
        
        # Formateamos el mes para que siempre tenga dos dígitos (ej: '04' en vez de '4')
        mes_formateado = str(mes).zfill(2)
        
        # 2. Buscamos coincidencias con el año y mes en el string de la fecha usando expresiones regulares
        # Esto asume que las fechas están guardadas en formato 'YYYY-MM-DD'
        filtro = {
            "empleado_id": empleado_id,
            "fecha": {"$regex": f"^{anio}-{mes_formateado}"}
        }
        
        # 3. Buscamos en la base de datos
        asistencias_db = coleccion_asistencia.find(filtro)
        
        # 4. Armamos la lista con las fechas y estados para el frontend
        datos_asistencia = []
        for asis in asistencias_db:
            datos_asistencia.append({
                'fecha': asis.get('fecha', ''),
                'estado': asis.get('estado', '')
            })
            
        # 5. Devolvemos los datos en formato JSON
        return JsonResponse({'status': 'success', 'data': datos_asistencia})
        
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
=======
    return JsonResponse(datos_formateados, safe=False)# Vistas del módulo Recursos Humanos
>>>>>>> 6f420e4afb79d51bbde3f94427245a867f275a51
