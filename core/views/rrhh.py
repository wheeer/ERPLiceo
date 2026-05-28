from django.http import JsonResponse
from core.db_connection import db
from bson.objectid import ObjectId

# Vistas del módulo Recursos Humanos

def lista_empleados(request):
    coleccion_empleados = db['empleados']
    filtro = {}
    if request.GET.get('activo') == 'true':
        filtro['activo'] = True

    empleados_db = coleccion_empleados.find(filtro)
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
    return JsonResponse(datos_formateados, safe=False)

def obtener_asistencia_mensual(request, mes, anio):
    try:
        empleado_id = request.GET.get('empleadoId')
        if not empleado_id:
            return JsonResponse({'status': 'success', 'data': []})
            
        # TRUCO MAESTRO: Buscar al empleado por su RUT para obtener su ID secreto de Mongo
        empleado = db['empleados'].find_one({"rut": empleado_id})
        mongo_id = str(empleado['_id']) if empleado else empleado_id
        
        coleccion_asistencia = db['asistencia']
        
        # Buscar usando TODAS las combinaciones posibles (RUT, ID de texto, y ObjectId)
        filtros = [
            {"empleado_id": empleado_id}, 
            {"rut": empleado_id},
            {"empleado_id": mongo_id}
        ]
        if len(mongo_id) == 24:
            filtros.append({"empleado_id": ObjectId(mongo_id)})
            
        asistencias_db = coleccion_asistencia.find({"$or": filtros})
        
        mes_str_2 = str(mes).zfill(2)
        mes_str_1 = str(mes)
        anio_str = str(anio)
        
        datos_asistencia = []
        for asis in asistencias_db:
            fecha_raw = asis.get('fecha')
            if not fecha_raw: 
                continue
                
            fecha_str = str(fecha_raw)
            # Filtro a prueba de balas para cualquier formato de fecha
            if (f"{anio_str}-{mes_str_2}" in fecha_str or 
                f"{anio_str}-{mes_str_1}" in fecha_str or 
                f"-{mes_str_2}-{anio_str}" in fecha_str or 
                f"-{mes_str_1}-{anio_str}" in fecha_str or
                f"/{mes_str_2}/{anio_str}" in fecha_str or
                f"/{mes_str_1}/{anio_str}" in fecha_str):
                
                datos_asistencia.append({
                    'fecha': fecha_str,
                    'estado': str(asis.get('estado', ''))
                })
                
        return JsonResponse({'status': 'success', 'data': datos_asistencia})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)