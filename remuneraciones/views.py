import json
import calendar
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from core.db_connection import col_empleados, col_remuneraciones, col_horas_extra, col_asistencia, registrar_auditoria
from bson import ObjectId
from core.jwt_middleware import jwt_required, role_required
from datetime import datetime
 
 
@csrf_exempt
@role_required('Encargado_Remuneraciones', 'Administrador_General')
def calcular_remuneraciones(request):
 
    if request.method != 'POST':
        return JsonResponse({
            "success": False,
            "message": "Método no permitido. Usa POST.",
            "data": None
        }, status=405)
 
    try:
        body = json.loads(request.body)
        mes = body.get("mes")
        anio = body.get("anio")
 
        if not mes or not anio:
            return JsonResponse({
                "success": False,
                "message": "Mes y año son obligatorios.",
                "data": None
            }, status=400)
 
        mes_int = int(mes)
        anio_int = int(anio)
 
        _, num_dias = calendar.monthrange(anio_int, mes_int)
        primer_dia = datetime(anio_int, mes_int, 1)
        ultimo_dia = datetime(anio_int, mes_int, num_dias, 23, 59, 59)
 
        asistencias = list(col_asistencia.find({
            "fecha": {"$gte": primer_dia, "$lte": ultimo_dia}
        }))
 
        if not asistencias:
            return JsonResponse({
                "success": False,
                "message": f"No existen registros de asistencia para {mes}/{anio}.",
                "data": None
            }, status=400)
 
        ausencias_por_rut = {}
        for registro in asistencias:
            rut = registro.get("rut")
            estado = registro.get("estado", "").lower()
            if estado in ["ausente", "inasistencia", "falta", "licencia"]:
                ausencias_por_rut[rut] = ausencias_por_rut.get(rut, 0) + 1
 
        empleados = list(col_empleados.find({
            "estado": {"$in": ["activo", "licencia"]}
        }))
 
        liquidaciones_generadas = []
 
        for empleado in empleados:
            rut = empleado["rut"]

            # Buscar si ya existe liquidación para el empleado en el período actual
            liquidacion_existente = col_remuneraciones.find_one({
                "rut": rut,
                "periodo.mes": mes_int,
                "periodo.anio": anio_int
            })

            estado_previo = "Pendiente"
            if liquidacion_existente:
                estado_previo = liquidacion_existente.get("estado_pago", "Pendiente")
                if estado_previo.lower() == "pagado":
                    # Blindaje: No se permite alterar liquidaciones con estado 'Pagado'
                    continue

            config = empleado.get("config_remuneracion", {})
            sueldo_base = config.get("sueldo_base", 0)
            movilizacion = config.get("movilizacion", 0)
            colacion = config.get("colacion", 0)
            afp_nombre = config.get("afp", "ProVida")
            salud_nombre = config.get("salud", "Fonasa")
 
            dias_ausentes = ausencias_por_rut.get(rut, 0)
 
            # Mes comercial chileno siempre es 30 días
            valor_dia = round(sueldo_base / 30)
            descuento_asistencia = valor_dia * dias_ausentes
 
            # El descuento rebaja el imponible antes de calcular AFP/Salud
            sueldo_base_pagado = sueldo_base - descuento_asistencia
            gratificacion = min(round(sueldo_base_pagado * 0.25), 205000)
 
            horas_extra_empleado = list(col_horas_extra.find({
                "rut": rut,
                "mes": mes_int,
                "anio": anio_int
            }))
 
            valor_hora = sueldo_base / 160
            total_horas_extra = 0
            cantidad_horas_extra = 0
 
            for hora_extra in horas_extra_empleado:
                horas = hora_extra.get("horas") or hora_extra.get("cantidad_horas") or 0
                cantidad_horas_extra += horas
                total_horas_extra += round(horas * valor_hora * 1.5)
 
            # total_imponible usa sueldo_base_pagado
            total_imponible = sueldo_base_pagado + gratificacion + total_horas_extra
            afp = round(total_imponible * 0.115)
            salud = round(total_imponible * 0.07)
 
            tipo_contrato = empleado.get("tipo_contrato", "").lower()
            seguro_cesantia = round(total_imponible * 0.006) if tipo_contrato == "indefinido" else 0
 
            total_descuentos = afp + salud + seguro_cesantia
            total_haberes = total_imponible + movilizacion + colacion
            sueldo_liquido = total_haberes - total_descuentos
 
            liquidacion = {
                "rut": rut,
                "estado_pago": estado_previo,
                "periodo": {"mes": mes_int, "anio": anio_int},
                "empleado": {
                    "nombre": empleado.get("nombre_completo", ""),
                    "cargo": empleado.get("cargo", ""),
                    "tipo_contrato": empleado.get("tipo_contrato", "")
                },
                "haberes": {
                    "imponibles": {
                        "sueldo_base": sueldo_base,
                        "gratificacion_legal": gratificacion,
                        "horas_extra": {"cantidad": cantidad_horas_extra, "monto": total_horas_extra}
                    },
                    "no_imponibles": {"movilizacion": movilizacion, "colacion": colacion}
                },
                "descuentos_legales": {
                    "afp": {"nombre": afp_nombre, "monto": afp},
                    "salud": {"nombre": salud_nombre, "monto": salud},
                    "seguro_cesantia": {"monto": seguro_cesantia},
                    "asistencia": {"dias_ausentes": dias_ausentes, "monto": descuento_asistencia}
                },
                "totales": {
                    "total_haberes": total_haberes,
                    "total_descuentos": total_descuentos,
                    "sueldo_liquido": sueldo_liquido
                },
                "bases": {
                    "imp_prev_salud": total_imponible,
                    "imp_cesantia": total_imponible,
                    # Base tributable = imponible menos cotizaciones obligatorias
                    "base_tributable": total_imponible - afp - salud - seguro_cesantia
                },
                "fecha_generacion": datetime.now()
            }
 
            if liquidacion_existente:
                # Upsert: Actualizar el documento existente
                col_remuneraciones.update_one(
                    {"_id": liquidacion_existente["_id"]},
                    {"$set": liquidacion}
                )
                liquidacion["_id"] = str(liquidacion_existente["_id"])
            else:
                # Insert normal
                resultado = col_remuneraciones.insert_one(liquidacion)
                liquidacion["_id"] = str(resultado.inserted_id)

            liquidaciones_generadas.append(liquidacion)

        actor_rut = request.user_data.get('rut', 'Sistema') if hasattr(request, 'user_data') else 'Sistema'
        actor_emp = col_empleados.find_one({"rut": actor_rut})
        actor_nombre = actor_emp.get("nombre_completo", actor_rut) if actor_emp else actor_rut
        
        if len(liquidaciones_generadas) > 0:
            registrar_auditoria(
                usuario_rut=actor_rut,
                usuario_nombre=actor_nombre,
                modulo="remuneraciones",
                accion="Liquidación Generada",
                descripcion=f"Se calcularon y guardaron {len(liquidaciones_generadas)} liquidaciones (Periodo {mes_int:02d}-{anio_int})."
            )

        return JsonResponse({
            "success": True,
            "message": f"Remuneraciones calculadas correctamente. {len(liquidaciones_generadas)} liquidaciones generadas.",
            "data": liquidaciones_generadas
        }, status=201)
 
    except Exception as e:
        return JsonResponse({
            "success": False,
            "message": f"Error al calcular remuneraciones: {str(e)}",
            "data": None
        }, status=500)
 
 
def _serializar_liquidacion(liquidacion, empleado):
    """Helper para serializar liquidación al formato frontend."""
    try:
        seguro_cesantia = liquidacion["descuentos_legales"]["seguro_cesantia"]
        seguro_cesantia_monto = seguro_cesantia["monto"] if isinstance(seguro_cesantia, dict) else seguro_cesantia
 
        rut_empleado = liquidacion.get("empleado_rut") or liquidacion.get("rut") or liquidacion.get("rut_empleado") or ""
        return {
            "id": str(liquidacion["_id"]),
            "rut": liquidacion["rut"],
            "nombre": empleado.get("nombre_completo", "") if empleado else "",
            "cargo": empleado.get("cargo", "") if empleado else "",
            "mes": liquidacion["periodo"]["mes"],
            "anio": liquidacion["periodo"]["anio"],
            "estadoPago": liquidacion.get("estado_pago", "Pendiente"),
            "motivoImpago": liquidacion.get("motivo_impago", ""),
            "sueldoBase": liquidacion["haberes"]["imponibles"]["sueldo_base"],
            "gratificacion": liquidacion["haberes"]["imponibles"]["gratificacion_legal"],
            "horasExtra": (
                liquidacion["haberes"]["imponibles"]["horas_extra"]["monto"]
                if isinstance(liquidacion["haberes"]["imponibles"]["horas_extra"], dict)
                else liquidacion["haberes"]["imponibles"]["horas_extra"]
            ),
            "movilizacion": liquidacion["haberes"]["no_imponibles"]["movilizacion"],
            "colacion": liquidacion["haberes"]["no_imponibles"]["colacion"],
            "afp": (
                liquidacion["descuentos_legales"]["afp"]["monto"]
                if isinstance(liquidacion["descuentos_legales"]["afp"], dict)
                else liquidacion["descuentos_legales"]["afp"]
            ),
            "salud": (
                liquidacion["descuentos_legales"]["salud"]["monto"]
                if isinstance(liquidacion["descuentos_legales"]["salud"], dict)
                else liquidacion["descuentos_legales"]["salud"]
            ),
            "seguroCesantia": seguro_cesantia_monto,
            "descuentoAsistencia": (
                liquidacion["descuentos_legales"]["asistencia"]["monto"]
                if isinstance(liquidacion["descuentos_legales"].get("asistencia"), dict)
                else 0
            ),
            # Días ausentes
            "diasAusentes": (
                liquidacion["descuentos_legales"]["asistencia"]["dias_ausentes"]
                if isinstance(liquidacion["descuentos_legales"].get("asistencia"), dict)
                else 0
            ),
            # Días trabajados = 30 - días ausentes (mes comercial chileno)
            "diasTrabajados": 30 - (
                liquidacion["descuentos_legales"]["asistencia"]["dias_ausentes"]
                if isinstance(liquidacion["descuentos_legales"].get("asistencia"), dict)
                else 0
            ),
            # Nombres de instituciones previsionales
            "afpNombre": (
                liquidacion["descuentos_legales"]["afp"]["nombre"]
                if isinstance(liquidacion["descuentos_legales"].get("afp"), dict)
                else "—"
            ),
            "saludNombre": (
                liquidacion["descuentos_legales"]["salud"]["nombre"]
                if isinstance(liquidacion["descuentos_legales"].get("salud"), dict)
                else "—"
            ),
            # Tipo de contrato real del empleado
            "tipoContrato": liquidacion.get("empleado", {}).get("tipo_contrato", "—"),
            # Estado del empleado (activo, licencia, etc.)
            "estadoEmpleado": empleado.get("estado", "—").capitalize() if empleado else "—",
            # Período formateado
            "periodoTexto": f"{liquidacion['periodo']['mes']}/{liquidacion['periodo']['anio']}",
            # Bases imponibles calculadas en backend (no reconstruir en frontend)
            "impPrevSalud": liquidacion.get("bases", {}).get("imp_prev_salud", 0),
            "impCesantia": liquidacion.get("bases", {}).get("imp_cesantia", 0),
            "baseTributable": liquidacion.get("bases", {}).get("base_tributable", 0),
            "totalHaberes": liquidacion["totales"]["total_haberes"],
            "totalDescuentos": liquidacion["totales"]["total_descuentos"],
            "neto": liquidacion["totales"]["sueldo_liquido"]
        }
    except Exception as e:
        print(f"Error serializando liquidacion {liquidacion.get('_id')}: {e}")
        return None
 
 
@csrf_exempt
@role_required('Encargado_Remuneraciones', 'Administrador_General')
def obtener_pdf_liquidacion(request, id):
 
    if request.method != 'GET':
        return JsonResponse({
            "success": False,
            "message": "Método no permitido. Usa GET.",
            "data": None
        }, status=405)
 
    try:
        if not ObjectId.is_valid(id):
            return JsonResponse({
                "success": False,
                "message": "ID de liquidación inválido.",
                "data": None
            }, status=400)
 
        liquidacion = col_remuneraciones.find_one({"_id": ObjectId(id)})
 
        if not liquidacion:
            return JsonResponse({
                "success": False,
                "message": "Liquidación no encontrada.",
                "data": None
            }, status=404)
 
        empleado = col_empleados.find_one({"rut": liquidacion["rut"]}) or {}
 
        return JsonResponse({
            "success": True,
            "message": "Datos PDF obtenidos correctamente.",
            "data": _serializar_liquidacion(liquidacion, empleado)
        }, status=200)
 
    except Exception as e:
        return JsonResponse({
            "success": False,
            "message": f"Error al obtener datos PDF: {str(e)}",
            "data": None
        }, status=500)
 
 
@csrf_exempt
@role_required('Encargado_Remuneraciones', 'Administrador_General')
def obtener_liquidacion_empleado(request, rut, mes, anio):
 
    if request.method != 'GET':
        return JsonResponse({
            "success": False,
            "message": "Método no permitido. Usa GET.",
            "data": None
        }, status=405)
 
    try:
        liquidacion = col_remuneraciones.find_one({
            "rut": rut,
            "periodo.mes": int(mes),
            "periodo.anio": int(anio)
        })
 
        if not liquidacion:
            return JsonResponse({
                "success": False,
                "message": "Liquidación no encontrada.",
                "data": None
            }, status=404)
 
        empleado = col_empleados.find_one({"rut": rut}) or {}
 
        return JsonResponse({
            "success": True,
            "message": "Liquidación obtenida correctamente.",
            "data": _serializar_liquidacion(liquidacion, empleado)
        }, status=200)
 
    except Exception as e:
        return JsonResponse({
            "success": False,
            "message": f"Error al obtener liquidación: {str(e)}",
            "data": None
        }, status=500)
 
 
@csrf_exempt
@role_required('Encargado_Remuneraciones', 'Administrador_General')
def obtener_remuneraciones(request, mes=None, anio=None):

    if request.method != 'GET':
        return JsonResponse({
            "success": False,
            "message": "Método no permitido. Usa GET.",
            "data": None
        }, status=405)
 
    try:
        rango = request.GET.get('rango')
        tipo = request.GET.get('tipo')
        resumen_cronologico = {}

        liquidaciones_bd = []

        if tipo:
            if tipo == 'mes_especifico':
                m = int(request.GET.get('mes'))
                a = int(request.GET.get('anio'))
                liquidaciones_bd = list(col_remuneraciones.find({"periodo.mes": m, "periodo.anio": a}))
            elif tipo == 'rango_meses':
                m_ini = int(request.GET.get('mes_inicio'))
                a_ini = int(request.GET.get('anio_inicio'))
                m_fin = int(request.GET.get('mes_fin'))
                a_fin = int(request.GET.get('anio_fin'))
                docs = list(col_remuneraciones.find({"periodo.anio": {"$gte": a_ini, "$lte": a_fin}}))
                for doc in docs:
                    m = doc.get("periodo", {}).get("mes", 0)
                    a = doc.get("periodo", {}).get("anio", 0)
                    val = a * 12 + m
                    if (a_ini * 12 + m_ini) <= val <= (a_fin * 12 + m_fin):
                        liquidaciones_bd.append(doc)
            elif tipo == 'anio_especifico':
                a = int(request.GET.get('anio'))
                liquidaciones_bd = list(col_remuneraciones.find({"periodo.anio": a}))
            elif tipo == 'rango_anios':
                a_ini = int(request.GET.get('anio_inicio'))
                a_fin = int(request.GET.get('anio_fin'))
                liquidaciones_bd = list(col_remuneraciones.find({"periodo.anio": {"$gte": a_ini, "$lte": a_fin}}))
        elif rango:
            import datetime
            ahora = datetime.datetime.now()
            if rango == 'anual':
                liquidaciones_bd = list(col_remuneraciones.find({"periodo.anio": ahora.year}))
            else:
                liquidaciones_bd = list(col_remuneraciones.find({"periodo.mes": ahora.month, "periodo.anio": ahora.year}))
        else:
            if not mes or not anio:
                return JsonResponse({"success": False, "message": "Falta mes y año", "data": None}, status=400)
            liquidaciones_bd = list(col_remuneraciones.find({"periodo.mes": int(mes), "periodo.anio": int(anio)}))

        # Pre-llenar resumen_cronologico con ceros para que la gráfica muestre el rango completo
        if tipo == 'rango_meses':
            m_ini = int(request.GET.get('mes_inicio'))
            a_ini = int(request.GET.get('anio_inicio'))
            m_fin = int(request.GET.get('mes_fin'))
            a_fin = int(request.GET.get('anio_fin'))
            curr_m = m_ini
            curr_a = a_ini
            while curr_a * 12 + curr_m <= a_fin * 12 + m_fin:
                clave = f"{curr_a}-{curr_m:02d}"
                resumen_cronologico[clave] = {"fecha": clave, "total_haberes": 0, "total_descuentos": 0}
                curr_m += 1
                if curr_m > 12:
                    curr_m = 1
                    curr_a += 1
        elif tipo == 'anio_especifico':
            a = int(request.GET.get('anio'))
            for m in range(1, 13):
                clave = f"{a}-{m:02d}"
                resumen_cronologico[clave] = {"fecha": clave, "total_haberes": 0, "total_descuentos": 0}
        elif tipo == 'rango_anios':
            a_ini = int(request.GET.get('anio_inicio'))
            a_fin = int(request.GET.get('anio_fin'))
            for a in range(a_ini, a_fin + 1):
                clave = f"{a}"
                resumen_cronologico[clave] = {"fecha": clave, "total_haberes": 0, "total_descuentos": 0}

        # Agrupación cronológica para el Dashboard
        if tipo or rango:
            for liq in liquidaciones_bd:
                m = liq.get("periodo", {}).get("mes", 1)
                a = liq.get("periodo", {}).get("anio", 2026)
                
                if tipo == 'rango_anios':
                    clave = f"{a}"
                else:
                    clave = f"{a}-{m:02d}"
                
                if clave not in resumen_cronologico:
                    resumen_cronologico[clave] = {
                        "fecha": clave,
                        "total_haberes": 0,
                        "total_descuentos": 0
                    }
                
                resumen_cronologico[clave]["total_haberes"] += liq.get("totales", {}).get("total_haberes", 0)
                resumen_cronologico[clave]["total_descuentos"] += liq.get("totales", {}).get("total_descuentos", 0)

        liquidaciones_frontend = []
        for liquidacion in liquidaciones_bd:

            rut_empleado = liquidacion.get("empleado_rut") or liquidacion.get("rut") or liquidacion.get("rut_empleado")
            empleado = col_empleados.find_one({
                "rut": liquidacion["rut"]
            })

            liq_serializada = _serializar_liquidacion(liquidacion, empleado)
            if liq_serializada:
                liquidaciones_frontend.append(liq_serializada)
            
        crono_sorted = sorted(list(resumen_cronologico.values()), key=lambda x: x["fecha"])

        return JsonResponse({
            "success": True,
            "message": "Remuneraciones obtenidas correctamente.",
            "data": liquidaciones_frontend,
            "resumen_cronologico": crono_sorted
        }, status=200)
 
    except Exception as e:
        return JsonResponse({
            "success": False,
            "message": f"Error al obtener remuneraciones: {str(e)}",
            "data": None
        }, status=500)
 
 
@csrf_exempt
@role_required('Encargado_Remuneraciones', 'Administrador_General')
def obtener_horas_extra(request, mes, anio):
 
    if request.method != 'GET':
        return JsonResponse({
            "success": False,
            "message": "Método no permitido. Usa GET.",
            "data": None
        }, status=405)
 
    try:
        horas_extra_bd = list(col_horas_extra.find({
            "mes": int(mes),
            "anio": int(anio)
        }))
 
        horas_extra_frontend = []
        for he in horas_extra_bd:
            rut_empleado = he.get("rut")
            empleado_obj = col_empleados.find_one({"rut": rut_empleado})
            nombre_empleado = empleado_obj.get("nombre_completo", rut_empleado) if empleado_obj else rut_empleado
            config = empleado_obj.get("config_remuneracion", {}) if empleado_obj else {}
            sueldo_base = config.get("sueldo_base", 0)
            
            horas_extra_frontend.append({
                "id": str(he["_id"]),
                "rut": rut_empleado,
                "nombre_empleado": nombre_empleado,
                "sueldo_base": sueldo_base,
                "horas": he.get("horas", 0),
                "tipo": he.get("tipo", "laboral"),
                "recargo": he.get("recargo", 50),
                "fecha": he.get("fecha"),
                "mes": he.get("mes"),
                "anio": he.get("anio")
            })
 
        return JsonResponse({
            "success": True,
            "message": "Horas extra obtenidas correctamente.",
            "data": horas_extra_frontend
        }, status=200)
 
    except Exception as e:
        return JsonResponse({
            "success": False,
            "message": f"Error al obtener horas extra: {str(e)}",
            "data": None
        }, status=500)


@csrf_exempt
@role_required('Encargado_Remuneraciones', 'Administrador_General')
def procesar_pagos_lote(request):
    if request.method not in ['POST', 'PUT']:
        return JsonResponse({
            "success": False,
            "message": "Método no permitido. Usa POST o PUT.",
            "data": None
        }, status=405)

    try:
        body = json.loads(request.body)
        pagados = body.get("pagados", [])
        impagos = body.get("impagos", [])

        if not isinstance(pagados, list) or not isinstance(impagos, list):
            return JsonResponse({
                "success": False,
                "message": "El payload debe contener listas de IDs en 'pagados' e 'impagos'.",
                "data": None
            }, status=400)

        # Convertir a ObjectId
        try:
            pagados_ids = [ObjectId(id_str) for id_str in pagados if ObjectId.is_valid(id_str)]
            impagos_ids = [ObjectId(id_str) for id_str in impagos if ObjectId.is_valid(id_str)]
        except Exception:
            return JsonResponse({
                "success": False,
                "message": "Uno o más IDs proporcionados no son válidos.",
                "data": None
            }, status=400)

        # VALIDACIÓN DE REGLAS DE NEGOCIO: No permitir modificar registros ya pagados
        todos_ids = pagados_ids + impagos_ids
        if todos_ids:
            pagados_existentes = col_remuneraciones.count_documents({
                "_id": {"$in": todos_ids},
                "estado_pago": "Pagado"
            })
            if pagados_existentes > 0:
                return JsonResponse({
                    "success": False,
                    "message": "Una o más liquidaciones ya se encuentran pagadas y no pueden ser modificadas.",
                    "data": None
                }, status=400)

        actualizados_pagados = 0
        actualizados_impagos = 0

        # Actualizar pagados
        if pagados_ids:
            res_pagados = col_remuneraciones.update_many(
                {"_id": {"$in": pagados_ids}},
                {"$set": {"estado_pago": "Pagado", "fecha_pago": datetime.now()}}
            )
            actualizados_pagados = res_pagados.modified_count

        # Actualizar impagos
        if impagos_ids:
            res_impagos = col_remuneraciones.update_many(
                {"_id": {"$in": impagos_ids}},
                {"$set": {"estado_pago": "Impago"}}
            )
            actualizados_impagos = res_impagos.modified_count

        # Registrar auditoría
        actor_rut = request.user_data.get('rut', 'Sistema') if hasattr(request, 'user_data') else 'Sistema'
        actor_emp = col_empleados.find_one({"rut": actor_rut})
        actor_nombre = actor_emp.get("nombre_completo", actor_rut) if actor_emp else actor_rut

        if actualizados_pagados > 0 or actualizados_impagos > 0:
            registrar_auditoria(
                usuario_rut=actor_rut,
                usuario_nombre=actor_nombre,
                modulo="remuneraciones",
                accion="Estado de Pago Actualizado (Lote)",
                descripcion=f"Se formalizaron pagos: {actualizados_pagados} pagados, {actualizados_impagos} impagos."
            )

        return JsonResponse({
            "success": True,
            "message": f"Se procesaron {actualizados_pagados} pagos y {actualizados_impagos} impagos correctamente.",
            "data": {
                "pagados": actualizados_pagados,
                "impagos": actualizados_impagos
            }
        }, status=200)

    except Exception as e:
        return JsonResponse({
            "success": False,
            "message": f"Error al procesar pagos en lote: {str(e)}",
            "data": None
        }, status=500)

@csrf_exempt
@role_required('Encargado_Remuneraciones', 'Administrador_General')
def declarar_impagos_lote(request):
    if request.method not in ['POST', 'PUT']:
        return JsonResponse({
            "success": False,
            "message": "Método no permitido. Usa POST o PUT.",
            "data": None
        }, status=405)

    try:
        body = json.loads(request.body)
        impagos = body.get("impagos", [])
        motivo = body.get("motivo", "").strip()

        if not isinstance(impagos, list) or not impagos:
            return JsonResponse({
                "success": False,
                "message": "El payload debe contener una lista de IDs en 'impagos'.",
                "data": None
            }, status=400)

        if not motivo:
            return JsonResponse({
                "success": False,
                "message": "Debe proporcionar un motivo o glosa para el impago.",
                "data": None
            }, status=400)

        try:
            impagos_ids = [ObjectId(id_str) for id_str in impagos if ObjectId.is_valid(id_str)]
        except Exception:
            return JsonResponse({
                "success": False,
                "message": "Uno o más IDs proporcionados no son válidos.",
                "data": None
            }, status=400)

        pagados_existentes = col_remuneraciones.count_documents({
            "_id": {"$in": impagos_ids},
            "estado_pago": "Pagado"
        })
        if pagados_existentes > 0:
            return JsonResponse({
                "success": False,
                "message": "Una o más liquidaciones ya se encuentran pagadas.",
                "data": None
            }, status=400)

        res_impagos = col_remuneraciones.update_many(
            {"_id": {"$in": impagos_ids}},
            {"$set": {
                "estado_pago": "Impago",
                "motivo_impago": motivo,
                "fecha_impago": datetime.now()
            }}
        )
        actualizados_impagos = res_impagos.modified_count

        actor_rut = request.user_data.get('rut', 'Sistema') if hasattr(request, 'user_data') else 'Sistema'
        actor_emp = col_empleados.find_one({"rut": actor_rut})
        actor_nombre = actor_emp.get("nombre_completo", actor_rut) if actor_emp else actor_rut

        if actualizados_impagos > 0:
            registrar_auditoria(
                usuario_rut=actor_rut,
                usuario_nombre=actor_nombre,
                modulo="remuneraciones",
                accion="Impago Declarado (Lote)",
                descripcion=f"Se declararon {actualizados_impagos} impagos. Motivo: {motivo}"
            )

        return JsonResponse({
            "success": True,
            "message": f"Se declararon {actualizados_impagos} impagos correctamente.",
            "data": {"impagos": actualizados_impagos}
        }, status=200)

    except Exception as e:
        return JsonResponse({
            "success": False,
            "message": f"Error al declarar impagos en lote: {str(e)}",
            "data": None
        }, status=500)