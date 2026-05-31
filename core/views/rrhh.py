import json
import calendar
from datetime import datetime
from bson.objectid import ObjectId

from django.http import JsonResponse

from core.db_connection import db, col_empleados, col_asistencia, col_horas_extra
from core.jwt_middleware import jwt_required
from django.views.decorators.csrf import csrf_exempt

# ==========================================
# CÓDIGO ORIGINAL (NO SE TOCÓ LA LÓGICA CORE, SOLO FIXES DE DATOS)
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
        empleado_id = request.GET.get('empleadoId', request.GET.get('rut'))
        
        empleados_activos = list(col_empleados.find(
            {"estado": "activo"}, 
            {"_id": 0, "rut": 1, "nombre_completo": 1}
        ))
        
        _, num_dias = calendar.monthrange(anio, mes)
        asistencia = []
        
        primer_dia = datetime(anio, mes, 1)
        ultimo_dia = datetime(anio, mes, num_dias, 23, 59, 59)
        
        if empleado_id:
            filtros = [
                {"empleado_rut": empleado_id},
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
            
            mapa_asistencia = {}
            for reg in registros:
                if isinstance(reg.get("fecha"), datetime):
                    f_str = reg["fecha"].strftime("%Y-%m-%d")
                else:
                    f_str = str(reg.get("fecha"))
                mapa_asistencia[f_str] = reg.get("estado")
            
            asistencia = [
                {
                    "fecha": f"{anio}-{mes:02d}-{dia:02d}",
                    "estado": mapa_asistencia.get(f"{anio}-{mes:02d}-{dia:02d}", "Sin registro")
                }
                for dia in range(1, num_dias + 1)
            ]
        else:
            # Si no hay empleado, retornamos los registros de todos (Criterio Issue)
            registros = list(col_asistencia.find(
                {"fecha": {"$gte": primer_dia, "$lte": ultimo_dia}},
                {"_id": 0}
            ))
            for reg in registros:
                if isinstance(reg.get("fecha"), datetime):
                    reg["fecha"] = reg["fecha"].strftime("%Y-%m-%d")
            asistencia = registros
            
        return JsonResponse({
            "empleados": empleados_activos,
            "asistencia": asistencia
        }, status=200)
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ==========================================
# NUEVOS ENDPOINTS API DRF - RRHH (ISSUE #17) - REFACTORIZADO A DJANGO PURO
# ==========================================

def format_mongo_doc(doc):
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

def parse_request_body(request):
    if not request.body:
        return {}
    try:
        return json.loads(request.body)
    except json.JSONDecodeError:
        return {}

# --- EMPLEADOS ---

@csrf_exempt
@jwt_required
def api_empleados(request):
    try:
        if request.method == 'GET':
            empleados = list(col_empleados.find({"estado": "activo"}))
            data = [format_mongo_doc(emp) for emp in empleados]
            return JsonResponse({"success": True, "data": data, "message": "Empleados activos obtenidos con éxito"}, status=200)
        
        elif request.method == 'POST':
            body = parse_request_body(request)
            
            if 'estado' not in body:
                body['estado'] = 'activo'
                
            rut = body.get('rut')
            if rut and col_empleados.find_one({"rut": rut}):
                return JsonResponse({"success": False, "data": [], "message": f"El empleado con RUT {rut} ya existe"}, status=400)
                
            result = col_empleados.insert_one(body)
            body['_id'] = str(result.inserted_id)
            return JsonResponse({"success": True, "data": [body], "message": "Empleado creado con éxito"}, status=201)
            
        else:
            return JsonResponse({"success": False, "data": [], "message": "Método no permitido"}, status=405)
            
    except Exception as e:
        return JsonResponse({"success": False, "data": [], "message": str(e)}, status=500)

@csrf_exempt
@jwt_required
def api_empleado_detalle(request, rut):
    try:
        empleado = col_empleados.find_one({"rut": rut})
        if not empleado:
            return JsonResponse({"success": False, "data": [], "message": "Empleado no encontrado"}, status=404)

        if request.method == 'GET':
            return JsonResponse({"success": True, "data": [format_mongo_doc(empleado)], "message": "Empleado obtenido con éxito"}, status=200)
            
        elif request.method == 'PUT':
            body = parse_request_body(request)
            col_empleados.update_one({"rut": rut}, {"$set": body})
            empleado_actualizado = col_empleados.find_one({"rut": rut})
            return JsonResponse({"success": True, "data": [format_mongo_doc(empleado_actualizado)], "message": "Empleado actualizado con éxito"}, status=200)
            
        elif request.method == 'DELETE':
            col_empleados.update_one({"rut": rut}, {"$set": {"estado": "inactivo"}})
            return JsonResponse({"success": True, "data": [], "message": "Empleado dado de baja con éxito"}, status=200)
            
        else:
            return JsonResponse({"success": False, "data": [], "message": "Método no permitido"}, status=405)
            
    except Exception as e:
        return JsonResponse({"success": False, "data": [], "message": str(e)}, status=500)


# --- ASISTENCIA ---

@csrf_exempt
@jwt_required
def api_asistencia(request, mes=None, anio=None):
    try:
        if request.method == 'GET':
            if not mes or not anio:
                return JsonResponse({"success": False, "data": [], "message": "Mes y año requeridos en la URL"}, status=400)
            
            mes_int, anio_int = int(mes), int(anio)
            _, num_dias = calendar.monthrange(anio_int, mes_int)
            primer_dia = datetime(anio_int, mes_int, 1)
            ultimo_dia = datetime(anio_int, mes_int, num_dias, 23, 59, 59)
            
            rut = request.GET.get('rut')
            query = {"fecha": {"$gte": primer_dia, "$lte": ultimo_dia}}
            
            if rut:
                query["$or"] = [{"empleado_rut": rut}, {"rut": rut}]
                
            asistencias = list(col_asistencia.find(query))
            data = [format_mongo_doc(a) for a in asistencias]
            
            for item in data:
                if isinstance(item.get('fecha'), datetime):
                    item['fecha'] = item['fecha'].strftime("%Y-%m-%d")

            return JsonResponse({"success": True, "data": data, "message": "Asistencia obtenida con éxito"}, status=200)
            
        elif request.method == 'POST':
            body = parse_request_body(request)
            estado = body.get('estado')
            horas_extra = body.get('horas_extra', 0)
            
            estados_validos = ["Presente", "Ausente", "Tardanza", "Licencia"]
            if estado not in estados_validos:
                return JsonResponse({"success": False, "data": [], "message": f"Estado inválido. Valores permitidos: {', '.join(estados_validos)}"}, status=400)
                
            try:
                horas_extra = int(horas_extra)
            except (ValueError, TypeError):
                horas_extra = 0
                
            if horas_extra < 0 or horas_extra > 2:
                return JsonResponse({"success": False, "data": [], "message": "Las horas extra deben ser un entero entre 0 y 2"}, status=400)
                
            body['horas_extra'] = horas_extra
            
            # Aseguramos parseo real de fecha a datetime (Issue 3)
            if 'fecha' in body and isinstance(body['fecha'], str):
                try:
                    fecha_obj = datetime.strptime(body['fecha'], "%Y-%m-%d")
                    body['fecha'] = fecha_obj
                except ValueError:
                    pass
            
            result = col_asistencia.insert_one(body)
            body['_id'] = str(result.inserted_id)
            
            if isinstance(body.get('fecha'), datetime):
                body['fecha'] = body['fecha'].strftime("%Y-%m-%d")
                
            return JsonResponse({"success": True, "data": [body], "message": "Asistencia registrada con éxito"}, status=201)
            
        else:
            return JsonResponse({"success": False, "data": [], "message": "Método no permitido"}, status=405)
            
    except Exception as e:
        return JsonResponse({"success": False, "data": [], "message": str(e)}, status=500)

@csrf_exempt
@jwt_required
def api_asistencia_resumen(request, mes, anio):
    try:
        if request.method == 'GET':
            mes_int, anio_int = int(mes), int(anio)
            _, num_dias = calendar.monthrange(anio_int, mes_int)
            primer_dia = datetime(anio_int, mes_int, 1)
            ultimo_dia = datetime(anio_int, mes_int, num_dias, 23, 59, 59)
            
            asistencias = list(col_asistencia.find({"fecha": {"$gte": primer_dia, "$lte": ultimo_dia}}))
            
            resumen = {}
            for asis in asistencias:
                rut = asis.get('empleado_rut') or asis.get('rut')
                if not rut:
                    continue
                    
                if rut not in resumen:
                    resumen[rut] = {
                        "empleado_rut": rut,
                        "Presente": 0,
                        "Ausente": 0,
                        "Tardanza": 0,
                        "Licencia": 0,
                        "Total": 0
                    }
                    
                estado = asis.get('estado')
                if estado in resumen[rut]:
                    resumen[rut][estado] += 1
                resumen[rut]["Total"] += 1
                
            data = list(resumen.values())
            return JsonResponse({"success": True, "data": data, "message": "Resumen de asistencia obtenido con éxito"}, status=200)
        else:
            return JsonResponse({"success": False, "data": [], "message": "Método no permitido"}, status=405)
            
    except Exception as e:
        return JsonResponse({"success": False, "data": [], "message": str(e)}, status=500)


# --- HORAS EXTRA ---

@csrf_exempt
@jwt_required
def api_horas_extra(request, mes=None, anio=None):
    try:
        if request.method == 'GET':
            if not mes or not anio:
                return JsonResponse({"success": False, "data": [], "message": "Mes y año requeridos en la URL"}, status=400)
                
            mes_int, anio_int = int(mes), int(anio)
            
            # Busqueda numerica para coincidir con seed_db (Issue 5)
            query = {"mes": mes_int, "anio": anio_int}
            
            rut = request.GET.get('rut')
            if rut:
                query["empleado_rut"] = rut
                
            horas_extra_list = list(col_horas_extra.find(query))
            data = [format_mongo_doc(hx) for hx in horas_extra_list]
            
            for item in data:
                if isinstance(item.get('fecha'), datetime):
                    item['fecha'] = item['fecha'].strftime("%Y-%m-%d")

            return JsonResponse({"success": True, "data": data, "message": "Horas extra obtenidas con éxito"}, status=200)
            
        elif request.method == 'POST':
            body = parse_request_body(request)
            
            # Mantenemos soporte de fecha, pero garantizamos mes y anio (Issue 5)
            if 'fecha' in body and isinstance(body['fecha'], str):
                try:
                    fecha_obj = datetime.strptime(body['fecha'], "%Y-%m-%d")
                    body['fecha'] = fecha_obj
                    if 'mes' not in body:
                        body['mes'] = fecha_obj.month
                    if 'anio' not in body:
                        body['anio'] = fecha_obj.year
                except ValueError:
                    pass
                    
            # Si no viene fecha pero vienen mes y anio
            if 'mes' in body and 'anio' in body:
                try:
                    body['mes'] = int(body['mes'])
                    body['anio'] = int(body['anio'])
                except ValueError:
                    pass
                    
            result = col_horas_extra.insert_one(body)
            body['_id'] = str(result.inserted_id)
            
            if isinstance(body.get('fecha'), datetime):
                body['fecha'] = body['fecha'].strftime("%Y-%m-%d")
                
            return JsonResponse({"success": True, "data": [body], "message": "Horas extra registradas con éxito"}, status=201)
            
        else:
            return JsonResponse({"success": False, "data": [], "message": "Método no permitido"}, status=405)
            
    except Exception as e:
        return JsonResponse({"success": False, "data": [], "message": str(e)}, status=500)