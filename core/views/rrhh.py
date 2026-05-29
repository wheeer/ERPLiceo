import calendar
from datetime import datetime
from django.http import JsonResponse
from core.db_connection import db, col_empleados, col_asistencia

# ==========================================
# CÓDIGO ORIGINAL (NO SE TOCÓ LA LÓGICA)
# ==========================================

def lista_empleados(request):
    coleccion_empleados = db['empleados']
    
    filtro = {}
    if request.GET.get('activo') == 'true':
        filtro['estado'] = 'activo'

    empleados_db = coleccion_empleados.find(filtro)
    
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
def obtener_asistencia_mensual(request, mes, anio):
    try:
        mes, anio = int(mes), int(anio)
        # El ID/RUT ahora se lee de los parámetros de consulta (Query Params)
        empleado_id = request.GET.get('empleadoId', request.GET.get('rut'))
        
        # 1. Obtenemos los empleados activos para llenar el Select del FrontEnd
        empleados_activos = list(col_empleados.find(
            {"estado": "activo"}, 
            {"_id": 0, "rut": 1, "nombre_completo": 1}
        ))
        
        _, num_dias = calendar.monthrange(anio, mes)
        asistencia = []
        
        # 2. Si se mandó un empleado, buscamos sus registros exactos
        if empleado_id:
            primer_dia = datetime(anio, mes, 1)
            ultimo_dia = datetime(anio, mes, num_dias, 23, 59, 59)
            
            filtros = [
                {"empleado_rut": empleado_id},  # ← Coincide con el campo del seed
                {"empleado_id": empleado_id},
                {"rut": empleado_id}
            ]
            
            registros = list(col_asistencia.find(
                {
                    "$or": filtros, 
                    "fecha": {"$gte": primer_dia, "$lte": ultimo_dia}
                },
                {"_id": 0, "fecha": 1, "estado": 1}
            ))
            
            mapa_asistencia = {reg["fecha"].strftime("%Y-%m-%d"): reg.get("estado") for reg in registros}
            
            asistencia = [
                {
                    "fecha": f"{anio}-{mes:02d}-{dia:02d}",
                    "estado": mapa_asistencia.get(f"{anio}-{mes:02d}-{dia:02d}", "Sin registro")
                }
                for dia in range(1, num_dias + 1)
            ]
        else:
            # 3. Si no hay empleado, retornamos los días en blanco
            asistencia = [
                {
                    "fecha": f"{anio}-{mes:02d}-{dia:02d}",
                    "estado": "Sin registro"
                }
                for dia in range(1, num_dias + 1)
            ]
            
        return JsonResponse({
            "empleados": empleados_activos,
            "asistencia": asistencia
        }, status=200)
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
