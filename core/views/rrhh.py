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
            empleados = list(col_empleados.find({"estado": {"$ne": "inactivo"}}))
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
            
            if not isinstance(body, list):
                registros = [body]
            else:
                registros = body
                
            estados_validos = [
                "Presente", "Ausente", "Tardanza", "Licencia", 
                "Atraso", "Ausente Injustificado", "Licencia Médica", 
                "Vacaciones", "Permiso S/Goce", "Finde", "Sin registro"
            ]
            
            # PASS 1: Validación y preparación de datos (Evitar inserciones parciales)
            registros_a_procesar = []
            for reg in registros:
                estado = reg.get('estado')
                horas_extra = reg.get('horas_extra', 0)
                rut_empleado = reg.get('rut') or reg.get('empleado_rut')
                
                if not estado or estado not in estados_validos or not rut_empleado:
                    continue
                    
                if estado in ["Finde", "Sin registro"]:
                    continue
                    
                try:
                    horas_extra = int(horas_extra)
                except (ValueError, TypeError):
                    horas_extra = 0
                    
                if horas_extra < 0 or horas_extra > 2:
                    horas_extra = 0
                    
                reg['horas_extra'] = horas_extra

                if estado in ["Presente", "Atraso"]:
                    if not reg.get('hora_entrada'):
                        reg['hora_entrada'] = "08:00"
                    if not reg.get('hora_salida'):
                        reg['hora_salida'] = "17:00"
                    if reg.get('horas_trabajadas') is None:
                        reg['horas_trabajadas'] = 9
                
                fecha_obj = None
                if 'fecha' in reg and isinstance(reg['fecha'], str):
                    try:
                        fecha_obj = datetime.strptime(reg['fecha'], "%Y-%m-%d")
                        reg['fecha'] = fecha_obj
                    except ValueError:
                        pass
                elif 'fecha' in reg and isinstance(reg['fecha'], datetime):
                    fecha_obj = reg['fecha']
                    
                if not fecha_obj:
                    continue
                    
                # Validación de duplicados PREVIA a cualquier inserción
                inicio_dia = datetime(fecha_obj.year, fecha_obj.month, fecha_obj.day, 0, 0, 0)
                fin_dia = datetime(fecha_obj.year, fecha_obj.month, fecha_obj.day, 23, 59, 59)
                
                duplicado = col_asistencia.find_one({
                    "$or": [{"empleado_rut": rut_empleado}, {"rut": rut_empleado}],
                    "fecha": {"$gte": inicio_dia, "$lte": fin_dia}
                })
                
                if duplicado:
                    return JsonResponse({
                        "success": False,
                        "data": [],
                        "message": f"Conflicto: Ya existe un registro de asistencia para el RUT {rut_empleado} en la fecha {fecha_obj.strftime('%Y-%m-%d')}."
                    }, status=409)
                    
                if 'rut' in reg and 'empleado_rut' not in reg:
                    reg['empleado_rut'] = reg['rut']
                    
                registros_a_procesar.append(reg)

            # PASS 2: Inserción segura
            procesados = 0
            datos_guardados = []
            
            for reg in registros_a_procesar:
                result = col_asistencia.insert_one(reg)
                reg['_id'] = str(result.inserted_id)
                
                if isinstance(reg.get('fecha'), datetime):
                    reg['fecha'] = reg['fecha'].strftime("%Y-%m-%d")
                    
                datos_guardados.append(reg)
                procesados += 1
                
            mensaje = f"Se procesaron {procesados} registros correctamente" if procesados > 0 else "No se procesaron registros nuevos (todos eran inválidos)"
            
            return JsonResponse({"success": True, "data": datos_guardados, "message": mensaje, "procesados": procesados}, status=201)
            
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
            
            # 1. Obtener empleados activos y pre-inicializar resumen
            empleados_activos = list(col_empleados.find({"estado": {"$ne": "inactivo"}}))
            resumen = {}
            for emp in empleados_activos:
                rut = emp.get("rut")
                if rut:
                    resumen[rut] = {
                        "rut": rut,
                        "nombre_completo": emp.get("nombre_completo", ""),
                        "dias_trabajados": 0,
                        "ausencias": 0,
                        "tardanzas": 0,
                        "licencias": 0,
                        "horas_extra_total": 0,
                        "tipo_dia_he": "laboral"
                    }
                    
            # 2. Contar estados desde los registros diarios reales (como pidió el frontend)
            asistencias = list(col_asistencia.find({"fecha": {"$gte": primer_dia, "$lte": ultimo_dia}}))
            for asis in asistencias:
                rut = asis.get('empleado_rut') or asis.get('rut')
                if not rut or rut not in resumen:
                    continue
                    
                estado = asis.get('estado')
                if estado == 'Presente':
                    resumen[rut]['dias_trabajados'] += 1
                elif estado == 'Ausente Injustificado':
                    resumen[rut]['ausencias'] += 1
                elif estado == 'Atraso':
                    resumen[rut]['tardanzas'] += 1
                elif estado == 'Licencia Médica':
                    resumen[rut]['licencias'] += 1
                    
            # 3. Procesar horas extra
            horas_extras = list(col_horas_extra.find({"mes": mes_int, "anio": anio_int}))
            for he in horas_extras:
                rut = he.get('rut') or he.get('rut_empleado') or he.get('empleado_rut')
                if not rut or rut not in resumen:
                    continue
                    
                horas = he.get("horas") or he.get("cantidad_horas") or 0
                tipo = he.get("tipo", "laboral").lower()
                
                resumen[rut]["horas_extra_total"] += horas
                if tipo == "festivo":
                    resumen[rut]["tipo_dia_he"] = "festivo"
                
            # 4. Retornar los datos
            data = list(resumen.values())
            return JsonResponse({"success": True, "data": data, "message": "Resumen mensual consolidado obtenido con éxito"}, status=200)
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
