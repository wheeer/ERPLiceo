import json
import calendar
from datetime import datetime
from bson.objectid import ObjectId

from django.http import JsonResponse

from core.db_connection import db, col_empleados, col_asistencia, col_horas_extra, registrar_auditoria
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
            
            actor_rut = request.user_data.get('rut', 'Sistema') if hasattr(request, 'user_data') else 'Sistema'
            actor_emp = col_empleados.find_one({"rut": actor_rut})
            actor_nombre = actor_emp.get("nombre_completo", actor_rut) if actor_emp else actor_rut
            
            registrar_auditoria(
                usuario_rut=actor_rut,
                usuario_nombre=actor_nombre,
                modulo="rrhh",
                accion="Empleado Registrado",
                descripcion=f"Se agregó nuevo empleado: {body.get('nombre_completo', rut)}"
            )

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
            
            actor_rut = request.user_data.get('rut', 'Sistema') if hasattr(request, 'user_data') else 'Sistema'
            actor_emp = col_empleados.find_one({"rut": actor_rut})
            actor_nombre = actor_emp.get("nombre_completo", actor_rut) if actor_emp else actor_rut
            
            registrar_auditoria(
                usuario_rut=actor_rut,
                usuario_nombre=actor_nombre,
                modulo="rrhh",
                accion="Ficha Actualizada",
                descripcion=f"Se modificaron los datos del empleado {rut}"
            )
            
            return JsonResponse({"success": True, "data": [format_mongo_doc(empleado_actualizado)], "message": "Empleado actualizado con éxito"}, status=200)
            
        elif request.method == 'DELETE':
            col_empleados.update_one({"rut": rut}, {"$set": {"estado": "inactivo"}})
            
            actor_rut = request.user_data.get('rut', 'Sistema') if hasattr(request, 'user_data') else 'Sistema'
            actor_emp = col_empleados.find_one({"rut": actor_rut})
            actor_nombre = actor_emp.get("nombre_completo", actor_rut) if actor_emp else actor_rut
            
            registrar_auditoria(
                usuario_rut=actor_rut,
                usuario_nombre=actor_nombre,
                modulo="rrhh",
                accion="Empleado Desvinculado",
                descripcion=f"Se cambió el estado del empleado {rut} a inactivo"
            )
            
            return JsonResponse({"success": True, "data": [], "message": "Empleado dado de baja con éxito"}, status=200)
            
        else:
            return JsonResponse({"success": False, "data": [], "message": "Método no permitido"}, status=405)
            
    except Exception as e:
        return JsonResponse({"success": False, "data": [], "message": str(e)}, status=500)


@csrf_exempt
@jwt_required
def api_empleado_swap(request, rut):
    try:
        if request.method == 'POST':
            body = parse_request_body(request)
            fecha_libre = body.get('fecha_libre')
            fecha_trabaja = body.get('fecha_trabaja')

            if not fecha_libre or not fecha_trabaja:
                return JsonResponse({"success": False, "data": [], "message": "Debe enviar fecha_libre y fecha_trabaja"}, status=400)

            empleado = col_empleados.find_one({"rut": rut})
            if not empleado:
                return JsonResponse({"success": False, "data": [], "message": "Empleado no encontrado"}, status=404)

            # Insertar en excepciones_jornada
            excepciones = empleado.get('excepciones_jornada', [])
            
            # Filtramos previas para evitar duplicados en el mismo dia
            excepciones = [e for e in excepciones if e.get('fecha') not in [fecha_libre, fecha_trabaja]]
            
            excepciones.append({"fecha": fecha_libre, "accion": "quitar"})
            excepciones.append({"fecha": fecha_trabaja, "accion": "agregar"})

            col_empleados.update_one({"rut": rut}, {"$set": {"excepciones_jornada": excepciones}})

            # Auditoría
            actor_rut = request.user_data.get('rut', 'Sistema') if hasattr(request, 'user_data') else 'Sistema'
            actor_emp = col_empleados.find_one({"rut": actor_rut})
            actor_nombre = actor_emp.get("nombre_completo", actor_rut) if actor_emp else actor_rut
            nombre_empleado = empleado.get("nombre_completo", rut)
            
            registrar_auditoria(
                usuario_rut=actor_rut,
                usuario_nombre=actor_nombre,
                modulo="rrhh",
                accion="Cambio de Turno (Swap)",
                descripcion=f"Se realizó un swap para {nombre_empleado}: Tomará libre el {fecha_libre} y trabajará el {fecha_trabaja}"
            )

            empleado_actualizado = col_empleados.find_one({"rut": rut})
            return JsonResponse({"success": True, "data": [format_mongo_doc(empleado_actualizado)], "message": "Turno cambiado con éxito"}, status=200)

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
                
            actor_rut = request.user_data.get('rut', 'Sistema') if hasattr(request, 'user_data') else 'Sistema'
            actor_emp = col_empleados.find_one({"rut": actor_rut})
            actor_nombre = actor_emp.get("nombre_completo", actor_rut) if actor_emp else actor_rut
            
            if procesados > 0:
                registrar_auditoria(
                    usuario_rut=actor_rut,
                    usuario_nombre=actor_nombre,
                    modulo="rrhh",
                    accion="Asistencia Registrada",
                    descripcion=f"Se registraron {procesados} entradas de asistencia."
                )
                
            mensaje = f"Se procesaron {procesados} registros correctamente" if procesados > 0 else "No se procesaron registros nuevos (todos eran inválidos)"
            
            return JsonResponse({"success": True, "data": datos_guardados, "message": mensaje, "procesados": procesados}, status=201)
            
        else:
            return JsonResponse({"success": False, "data": [], "message": "Método no permitido"}, status=405)
            
    except Exception as e:
        return JsonResponse({"success": False, "data": [], "message": str(e)}, status=500)

@csrf_exempt
@jwt_required
def api_asistencia_resumen(request, mes=None, anio=None):
    try:
        if request.method == 'GET':
            from datetime import timedelta, UTC, datetime
            import calendar
            ahora = datetime.now()
            
            tipo = request.GET.get('tipo')
            rango = request.GET.get('rango')
            
            if tipo:
                if tipo == 'diario':
                    fecha_str = request.GET.get('fecha')
                    if not fecha_str: return JsonResponse({"success": False, "message": "Falta fecha"}, status=400)
                    dt = datetime.strptime(fecha_str, "%Y-%m-%d")
                    primer_dia = dt.replace(hour=0, minute=0, second=0, microsecond=0)
                    ultimo_dia = dt.replace(hour=23, minute=59, second=59, microsecond=999999)
                elif tipo == 'rango_fechas':
                    f_ini = request.GET.get('fecha_inicio')
                    f_fin = request.GET.get('fecha_fin')
                    if not f_ini or not f_fin: return JsonResponse({"success": False, "message": "Faltan fechas inicio/fin"}, status=400)
                    dt_ini = datetime.strptime(f_ini, "%Y-%m-%d")
                    dt_fin = datetime.strptime(f_fin, "%Y-%m-%d")
                    primer_dia = dt_ini.replace(hour=0, minute=0, second=0, microsecond=0)
                    ultimo_dia = dt_fin.replace(hour=23, minute=59, second=59, microsecond=999999)
                elif tipo == 'mensual':
                    m = int(request.GET.get('mes', ahora.month))
                    a = int(request.GET.get('anio', ahora.year))
                    _, num_dias = calendar.monthrange(a, m)
                    primer_dia = datetime(a, m, 1)
                    ultimo_dia = datetime(a, m, num_dias, 23, 59, 59, 999999)
                elif tipo == 'anual':
                    a = int(request.GET.get('anio', ahora.year))
                    primer_dia = datetime(a, 1, 1)
                    ultimo_dia = datetime(a, 12, 31, 23, 59, 59, 999999)
                else:
                    return JsonResponse({"success": False, "message": "Tipo no válido"}, status=400)
            elif rango:
                if rango == 'semanal':
                    primer_dia = ahora - timedelta(days=7)
                    ultimo_dia = ahora
                elif rango == 'mensual':
                    primer_dia = ahora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                    ultimo_dia = ahora
                elif rango == 'anual':
                    primer_dia = ahora.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
                    ultimo_dia = ahora
                else:
                    return JsonResponse({"success": False, "message": "Rango no válido"}, status=400)
            else:
                if not mes or not anio:
                    return JsonResponse({"success": False, "message": "Falta mes/anio, rango o tipo"}, status=400)
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
            
            resumen_cronologico = {} # Para el dashboard
            
            for asis in asistencias:
                rut = asis.get('empleado_rut') or asis.get('rut')
                fecha = asis.get('fecha')
                estado = asis.get('estado')
                
                # Agrupación cronológica (solo ausencias para el chart principal)
                if isinstance(fecha, datetime):
                    # Si es anual, agrupamos por mes. Si es mensual/semanal/rango, por día.
                    if tipo == 'anual' or rango == 'anual':
                        clave_fecha = f"{fecha.year}-{fecha.month:02d}"
                    else:
                        clave_fecha = f"{fecha.year}-{fecha.month:02d}-{fecha.day:02d}"
                    
                    if clave_fecha not in resumen_cronologico:
                        resumen_cronologico[clave_fecha] = 0
                    if estado == "Ausente":
                        resumen_cronologico[clave_fecha] += 1

                # Agrupación por empleado
                if not rut or rut not in resumen:
                    continue
                    
                if estado == 'Presente':
                    resumen[rut]['dias_trabajados'] += 1
                elif estado in ['Ausente', 'Ausente Injustificado']:
                    resumen[rut]['ausencias'] += 1
                elif estado in ['Atraso', 'Tardanza']:
                    resumen[rut]['tardanzas'] += 1
                elif estado in ['Licencia', 'Licencia Médica']:
                    resumen[rut]['licencias'] += 1
                    
            # 3. Procesar horas extra
            filtro_he = {}
            if tipo or rango:
                filtro_he = {"anio": primer_dia.year}
                if tipo != 'anual' and rango != 'anual':
                    filtro_he["mes"] = primer_dia.month
            else:
                filtro_he = {"mes": mes_int, "anio": anio_int}
                
            horas_extras = list(col_horas_extra.find(filtro_he))
            for he in horas_extras:
                rut = he.get('rut') or he.get('rut_empleado') or he.get('empleado_rut')
                if not rut or rut not in resumen:
                    continue
                    
                horas = he.get("horas") or he.get("cantidad_horas") or 0
                tipo = he.get("tipo", "laboral").lower()
                
                resumen[rut]["horas_extra_total"] += horas
                if tipo == "festivo":
                    resumen[rut]["tipo_dia_he"] = "festivo"
                
            data = list(resumen.values())
            
            # Ordenar el resumen cronológico
            crono_sorted = [{"fecha": k, "ausencias": v} for k, v in sorted(resumen_cronologico.items())]
            
            return JsonResponse({
                "success": True, 
                "data": data,
                "resumen_cronologico": crono_sorted,
                "message": "Resumen de asistencia obtenido con éxito"
            }, status=200)
        else:
            return JsonResponse({"success": False, "data": [], "message": "Método no permitido"}, status=405)
            
    except Exception as e:
        return JsonResponse({"success": False, "data": [], "message": str(e)}, status=500)

@csrf_exempt
@jwt_required
def api_asistencia_estado_hoy(request):
    try:
        if request.method == 'GET':
            from datetime import datetime
            hoy = datetime.now()
            
            inicio_dia = datetime(hoy.year, hoy.month, hoy.day, 0, 0, 0)
            fin_dia = datetime(hoy.year, hoy.month, hoy.day, 23, 59, 59)
            
            empleados_activos = list(col_empleados.find({"estado": {"$ne": "inactivo"}}))
            
            # Contar solo los que deben asistir hoy
            hoy_str = hoy.strftime('%Y-%m-%d')
            hoy_weekday = hoy.weekday()
            activos_esperados = 0
            
            for emp in empleados_activos:
                # 1. Revisar excepciones
                excepciones = emp.get("excepciones_jornada", [])
                accion_excepcion = next((ex.get("accion") for ex in excepciones if ex.get("fecha") == hoy_str), None)
                
                if accion_excepcion == "agregar":
                    activos_esperados += 1
                elif accion_excepcion == "quitar":
                    continue
                else:
                    # 2. Revisar jornada base
                    config = emp.get("config_jornada", {})
                    dias_asistencia = config.get("dias_asistencia", [0,1,2,3,4]) # Default L-V
                    if hoy_weekday in dias_asistencia:
                        activos_esperados += 1
            
            registros_hoy = col_asistencia.count_documents({
                "fecha": {"$gte": inicio_dia, "$lte": fin_dia}
            })
            
            # Si hoy no se espera a nadie, el día se considera sellado
            dia_sellado = True if activos_esperados == 0 else (registros_hoy > 0 and registros_hoy >= activos_esperados)
            
            return JsonResponse({
                "success": True,
                "dia_sellado": dia_sellado,
                "es_finde": False, # Retornamos False porque la UI ya no debe bloquear fines de semana genéricos
                "total_registros": registros_hoy,
                "total_activos": activos_esperados
            }, status=200)
        else:
            return JsonResponse({"success": False, "message": "Método no permitido"}, status=405)
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)

@csrf_exempt
@jwt_required
def api_asistencia_sellar(request):
    try:
        if request.method == 'POST':
            from datetime import datetime
            hoy = datetime.now()
            
            inicio_dia = datetime(hoy.year, hoy.month, hoy.day, 0, 0, 0)
            fin_dia = datetime(hoy.year, hoy.month, hoy.day, 23, 59, 59)
            
            # Buscar empleados activos
            empleados_activos = list(col_empleados.find({"estado": {"$ne": "inactivo"}}))
            
            # Buscar registros de hoy
            registros_hoy = list(col_asistencia.find({
                "fecha": {"$gte": inicio_dia, "$lte": fin_dia}
            }))
            
            ruts_con_registro = set()
            for r in registros_hoy:
                rut = r.get('empleado_rut') or r.get('rut')
                if rut: ruts_con_registro.add(rut)
                
            nuevos_registros = []
            fecha_obj = datetime(hoy.year, hoy.month, hoy.day, 0, 0, 0)
            hoy_str = hoy.strftime('%Y-%m-%d')
            hoy_weekday = hoy.weekday()
            
            for emp in empleados_activos:
                rut_emp = emp.get('rut')
                if not rut_emp or rut_emp in ruts_con_registro:
                    continue
                    
                # Lógica Inteligente de Asistencia
                debe_asistir = False
                excepciones = emp.get("excepciones_jornada", [])
                accion_excepcion = next((ex.get("accion") for ex in excepciones if ex.get("fecha") == hoy_str), None)
                
                config = emp.get("config_jornada", {})
                dias_asistencia = config.get("dias_asistencia", [0,1,2,3,4])
                
                if accion_excepcion == "agregar":
                    debe_asistir = True
                elif accion_excepcion == "quitar":
                    debe_asistir = False
                else:
                    debe_asistir = hoy_weekday in dias_asistencia
                    
                if debe_asistir:
                    # Calcular horas trabajadas proporcionales (K.I.S.S.)
                    horas_contrato = config.get("horas_contrato", 44)
                    cant_dias = len(dias_asistencia) if len(dias_asistencia) > 0 else 5
                    horas_promedio = round(horas_contrato / cant_dias, 1) if horas_contrato else 9
                    
                    nuevos_registros.append({
                        "rut": rut_emp,
                        "empleado_rut": rut_emp,
                        "estado": "Presente",
                        "fecha": fecha_obj,
                        "hora_entrada": "08:00",
                        "hora_salida": "17:00", # Horas fijas de referencia
                        "horas_trabajadas": horas_promedio,
                        "horas_extra": 0,
                        "comentario": "Generado automáticamente por sellado (Modo Zen predictivo)"
                    })
            
            insertados = 0
            if nuevos_registros:
                result = col_asistencia.insert_many(nuevos_registros)
                insertados = len(result.inserted_ids)
                
                actor_rut = request.user_data.get('rut', 'Sistema') if hasattr(request, 'user_data') else 'Sistema'
                actor_emp = col_empleados.find_one({"rut": actor_rut})
                actor_nombre = actor_emp.get("nombre_completo", actor_rut) if actor_emp else actor_rut
                
                registrar_auditoria(
                    usuario_rut=actor_rut,
                    usuario_nombre=actor_nombre,
                    modulo="rrhh",
                    accion="Día de Asistencia Sellado",
                    descripcion=f"Se selló la asistencia predictiva insertando {insertados} presentes implícitos."
                )

            return JsonResponse({
                "success": True,
                "message": f"Día sellado exitosamente. Se registraron {insertados} presentes por defecto.",
                "insertados": insertados
            }, status=200)
        else:
            return JsonResponse({"success": False, "message": "Método no permitido"}, status=405)
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)


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
                
            actor_rut = request.user_data.get('rut', 'Sistema') if hasattr(request, 'user_data') else 'Sistema'
            actor_emp = col_empleados.find_one({"rut": actor_rut})
            actor_nombre = actor_emp.get("nombre_completo", actor_rut) if actor_emp else actor_rut
            
            rut_afectado = body.get('rut') or body.get('empleado_rut') or body.get('rut_empleado') or ''
            horas_he = body.get('horas') or body.get('cantidad_horas') or 0
            
            registrar_auditoria(
                usuario_rut=actor_rut,
                usuario_nombre=actor_nombre,
                modulo="rrhh",
                accion="Horas Extra Añadidas",
                descripcion=f"Se registraron {horas_he} horas extra para {rut_afectado}."
            )
                
            return JsonResponse({"success": True, "data": [body], "message": "Horas extra registradas con éxito"}, status=201)
            
        else:
            return JsonResponse({"success": False, "data": [], "message": "Método no permitido"}, status=405)
            
    except Exception as e:
        return JsonResponse({"success": False, "data": [], "message": str(e)}, status=500)
