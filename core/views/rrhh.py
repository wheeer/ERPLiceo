
import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from core.db_connection import col_empleados, col_asistencia, col_horas_extra
from core.jwt_middleware import jwt_required

# --- Empleados ---

@csrf_exempt
@jwt_required
def empleados_lista(request):
    if request.method == 'GET':
        try:
            # listar empleados activos (activo no es False o estado != inactivo según seed_db)
            empleados_db = list(col_empleados.find({
                "$and": [
                    {"activo": {"$ne": False}},
                    {"estado": {"$ne": "inactivo"}}
                ]
            }))
            
            for emp in empleados_db:
                emp['_id'] = str(emp['_id'])
            
            return JsonResponse({
                "success": True, 
                "data": empleados_db, 
                "message": "Empleados listados correctamente"
            }, status=200)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e), "data": []}, status=500)
            
    elif request.method == 'POST':
        try:
            body = json.loads(request.body)
            rut = body.get('rut')
            
            if not rut:
                return JsonResponse({"success": False, "message": "El RUT es obligatorio", "data": None}, status=400)
            
            if col_empleados.find_one({"rut": rut}):
                return JsonResponse({"success": False, "message": "Ya existe un empleado con ese RUT", "data": None}, status=400)
                
            nuevo_empleado = {
                "rut": rut,
                "nombre_completo": body.get("nombre_completo", ""),
                "correo": body.get("correo", ""),
                "cargo": body.get("cargo", ""),
                "departamento": body.get("departamento", ""),
                "fecha_ingreso": body.get("fecha_ingreso", datetime.now().strftime("%Y-%m-%d")),
                "tipo_contrato": body.get("tipo_contrato", "Plazo Fijo"),
                "sueldo_base": body.get("sueldo_base", 0),
                "estado": "activo",
                "activo": True
            }
            
            resultado = col_empleados.insert_one(nuevo_empleado)
            nuevo_empleado['_id'] = str(resultado.inserted_id)
            
            return JsonResponse({"success": True, "data": nuevo_empleado, "message": "Empleado creado correctamente"}, status=201)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e), "data": None}, status=500)
            
    else:
        return JsonResponse({"success": False, "message": "Método no permitido", "data": None}, status=405)


@csrf_exempt
@jwt_required
def empleados_detalle(request, rut):
    if request.method == 'GET':
        try:
            empleado = col_empleados.find_one({"rut": rut})
            if not empleado:
                return JsonResponse({"success": False, "message": "Empleado no encontrado", "data": None}, status=404)
            
            empleado['_id'] = str(empleado['_id'])
            return JsonResponse({"success": True, "data": empleado, "message": "Empleado obtenido correctamente"}, status=200)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e), "data": None}, status=500)
            
    elif request.method == 'PUT':
        try:
            body = json.loads(request.body)
            empleado = col_empleados.find_one({"rut": rut})
            if not empleado:
                return JsonResponse({"success": False, "message": "Empleado no encontrado", "data": None}, status=404)
            
            if "_id" in body:
                del body["_id"]
            if "rut" in body:
                del body["rut"]
                
            col_empleados.update_one({"rut": rut}, {"$set": body})
            
            empleado_actualizado = col_empleados.find_one({"rut": rut})
            empleado_actualizado['_id'] = str(empleado_actualizado['_id'])
            
            return JsonResponse({"success": True, "data": empleado_actualizado, "message": "Empleado actualizado correctamente"}, status=200)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e), "data": None}, status=500)
            
    elif request.method == 'DELETE':
        try:
            empleado = col_empleados.find_one({"rut": rut})
            if not empleado:
                return JsonResponse({"success": False, "message": "Empleado no encontrado", "data": None}, status=404)
                
            col_empleados.update_one({"rut": rut}, {"$set": {"activo": False, "estado": "inactivo"}})
            
            return JsonResponse({"success": True, "data": None, "message": "Empleado dado de baja correctamente"}, status=200)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e), "data": None}, status=500)
            
    else:
        return JsonResponse({"success": False, "message": "Método no permitido", "data": None}, status=405)

# --- Asistencia ---

@csrf_exempt
@jwt_required
def asistencia_registro(request):
    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            empleado_rut = body.get('empleado_rut')
            fecha = body.get('fecha')
            estado = body.get('estado')
            horas_extra = body.get('horas_extra', 0)
            
            if not all([empleado_rut, fecha, estado]):
                return JsonResponse({"success": False, "message": "Faltan campos obligatorios", "data": None}, status=400)
                
            estados_validos = ["Presente", "Ausente", "Tardanza", "Licencia"]
            if estado not in estados_validos:
                return JsonResponse({"success": False, "message": "Estado inválido", "data": None}, status=400)
                
            try:
                horas_extra = int(horas_extra)
                if not (0 <= horas_extra <= 2):
                    return JsonResponse({"success": False, "message": "Horas extra debe estar entre 0 y 2", "data": None}, status=400)
            except ValueError:
                return JsonResponse({"success": False, "message": "Horas extra inválido", "data": None}, status=400)
            
            nueva_asistencia = {
                "empleado_rut": empleado_rut,
                "fecha": fecha,
                "estado": estado,
                "horas_extra": horas_extra
            }
            
            resultado = col_asistencia.insert_one(nueva_asistencia)
            nueva_asistencia['_id'] = str(resultado.inserted_id)
            
            return JsonResponse({"success": True, "data": nueva_asistencia, "message": "Asistencia registrada correctamente"}, status=201)
            
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e), "data": None}, status=500)
    else:
        return JsonResponse({"success": False, "message": "Método no permitido", "data": None}, status=405)


@csrf_exempt
@jwt_required
def asistencia_mensual(request, mes, anio):
    if request.method == 'GET':
        try:
            mes, anio = int(mes), int(anio)
            empleado_id = request.GET.get('empleadoId', request.GET.get('rut'))
            
            # 1. Obtenemos los empleados activos para llenar el Select del FrontEnd
            empleados_activos = list(col_empleados.find(
                {
                    "$and": [
                        {"activo": {"$ne": False}},
                        {"estado": {"$ne": "inactivo"}}
                    ]
                }, 
                {"_id": 0, "rut": 1, "nombre_completo": 1}
            ))
            
            import calendar
            _, num_dias = calendar.monthrange(anio, mes)
            mes_str = str(mes).zfill(2)
            prefijo_fecha = f"{anio}-{mes_str}"
            
            asistencia = []
            
            if empleado_id:
                filtros = [
                    {"empleado_rut": empleado_id},
                    {"empleado_id": empleado_id},
                    {"rut": empleado_id}
                ]
                
                registros = list(col_asistencia.find(
                    {
                        "$or": filtros, 
                        "fecha": {"$regex": f"^{prefijo_fecha}"}
                    },
                    {"_id": 0, "fecha": 1, "estado": 1, "horas_extra": 1}
                ))
                
                mapa_asistencia = {reg["fecha"]: reg.get("estado") for reg in registros}
                
                asistencia = [
                    {
                        "fecha": f"{anio}-{mes:02d}-{dia:02d}",
                        "estado": mapa_asistencia.get(f"{anio}-{mes:02d}-{dia:02d}", "Sin registro")
                    }
                    for dia in range(1, num_dias + 1)
                ]
            else:
                asistencia = [
                    {
                        "fecha": f"{anio}-{mes:02d}-{dia:02d}",
                        "estado": "Sin registro"
                    }
                    for dia in range(1, num_dias + 1)
                ]
                
            return JsonResponse({
                "success": True, 
                "data": {
                    "empleados": empleados_activos,
                    "asistencia": asistencia
                }, 
                "message": "Asistencia mensual obtenida"
            }, status=200)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e), "data": []}, status=500)
    else:
        return JsonResponse({"success": False, "message": "Método no permitido", "data": None}, status=405)


@csrf_exempt
@jwt_required
def asistencia_resumen(request, mes, anio):
    if request.method == 'GET':
        try:
            mes_str = str(mes).zfill(2)
            prefijo_fecha = f"{anio}-{mes_str}"
            
            asistencias = list(col_asistencia.find({"fecha": {"$regex": f"^{prefijo_fecha}"}}))
            
            resumen = {}
            for asis in asistencias:
                rut = asis.get("empleado_rut")
                if not rut:
                    continue
                    
                if rut not in resumen:
                    resumen[rut] = {
                        "empleado_rut": rut,
                        "dias_presente": 0,
                        "dias_ausente": 0,
                        "dias_licencia": 0,
                        "dias_tardanza": 0,
                        "total_horas_extra": 0
                    }
                
                estado = asis.get("estado")
                if estado == "Presente":
                    resumen[rut]["dias_presente"] += 1
                elif estado == "Ausente":
                    resumen[rut]["dias_ausente"] += 1
                elif estado == "Licencia":
                    resumen[rut]["dias_licencia"] += 1
                elif estado == "Tardanza":
                    resumen[rut]["dias_tardanza"] += 1
                    
                resumen[rut]["total_horas_extra"] += asis.get("horas_extra", 0)
                
            return JsonResponse({"success": True, "data": list(resumen.values()), "message": "Resumen de asistencia obtenido"}, status=200)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e), "data": []}, status=500)
    else:
        return JsonResponse({"success": False, "message": "Método no permitido", "data": None}, status=405)

# --- Horas Extra ---

@csrf_exempt
@jwt_required
def horas_extra_lista(request, mes, anio):
    if request.method == 'GET':
        try:
            mes_str = str(mes).zfill(2)
            prefijo_fecha = f"{anio}-{mes_str}"
            
            he_list = list(col_horas_extra.find({"fecha": {"$regex": f"^{prefijo_fecha}"}}))
            
            for he in he_list:
                he['_id'] = str(he['_id'])
                
            return JsonResponse({"success": True, "data": he_list, "message": "Horas extra obtenidas"}, status=200)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e), "data": []}, status=500)
    else:
        return JsonResponse({"success": False, "message": "Método no permitido", "data": None}, status=405)


@csrf_exempt
@jwt_required
def horas_extra_registro(request):
    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            empleado_rut = body.get('empleado_rut')
            fecha = body.get('fecha')
            cantidad = body.get('cantidad', 0)
            motivo = body.get('motivo', '')
            
            if not all([empleado_rut, fecha, cantidad is not None]):
                return JsonResponse({"success": False, "message": "Faltan campos obligatorios", "data": None}, status=400)
                
            try:
                cantidad = int(cantidad)
                if not (0 < cantidad <= 2):
                    return JsonResponse({"success": False, "message": "Horas extra debe estar entre 1 y 2", "data": None}, status=400)
            except ValueError:
                return JsonResponse({"success": False, "message": "Cantidad inválida", "data": None}, status=400)
            
            try:
                fecha_obj = datetime.strptime(fecha, "%Y-%m-%d")
            except ValueError:
                return JsonResponse({"success": False, "message": "Formato de fecha inválido. Use YYYY-MM-DD", "data": None}, status=400)

            nueva_he = {
                "empleado_rut": empleado_rut,
                "rut": empleado_rut, # Compatibilidad con remuneraciones
                "fecha": fecha,
                "mes": fecha_obj.month, # Compatibilidad con remuneraciones
                "anio": fecha_obj.year, # Compatibilidad con remuneraciones
                "cantidad": cantidad,
                "horas": cantidad, # Compatibilidad con remuneraciones
                "motivo": motivo,
                "autorizado": True
            }
            
            resultado = col_horas_extra.insert_one(nueva_he)
            nueva_he['_id'] = str(resultado.inserted_id)
            
            return JsonResponse({"success": True, "data": nueva_he, "message": "Hora extra registrada correctamente"}, status=201)
            
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e), "data": None}, status=500)
    else:
        return JsonResponse({"success": False, "message": "Método no permitido", "data": None}, status=405)
