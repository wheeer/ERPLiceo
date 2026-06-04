import json
import calendar
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from core.db_connection import col_empleados, col_remuneraciones, col_horas_extra, col_asistencia
from bson import ObjectId
from core.jwt_middleware import jwt_required
from datetime import datetime
 
 
@csrf_exempt
@jwt_required
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
 
        existe = col_remuneraciones.find_one({
            "periodo.mes": int(mes),
            "periodo.anio": int(anio)
        })
 
        if existe:
            return JsonResponse({
                "success": False,
                "message": "Ya existen liquidaciones para ese período.",
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
            rut = registro.get("empleado_rut") or registro.get("rut_empleado") or registro.get("rut")
            estado = registro.get("estado", "").lower()
            if estado in ["ausente", "inasistencia", "falta", "licencia"]:
                ausencias_por_rut[rut] = ausencias_por_rut.get(rut, 0) + 1
 
        empleados = list(col_empleados.find({
            "estado": {"$in": ["activo", "licencia"]}
        }))
 
        liquidaciones_generadas = []
 
        for empleado in empleados:
            rut = empleado["rut"]
            config = empleado.get("config_remuneracion", {})
            sueldo_base = config.get("sueldo_base", 0)
            movilizacion = config.get("movilizacion", 0)
            colacion = config.get("colacion", 0)
            afp_nombre = config.get("afp", "ProVida")
            salud_nombre = config.get("salud", "Fonasa")
 
            dias_ausentes = ausencias_por_rut.get(rut, 0)
 
            # FIX #25 (🚨2): Mes comercial chileno siempre es 30 días
            valor_dia = round(sueldo_base / 30)
            descuento_asistencia = valor_dia * dias_ausentes
 
            # FIX #25 (🚨1): El descuento rebaja el imponible antes de calcular AFP/Salud
            sueldo_base_pagado = sueldo_base - descuento_asistencia
            gratificacion = min(round(sueldo_base_pagado * 0.25), 205000)
 
            horas_extra_empleado = list(col_horas_extra.find({
                "$or": [{"rut_empleado": rut}, {"rut": rut}],
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
 
            # FIX #25 (🚨1): total_imponible usa sueldo_base_pagado, no sueldo_base
            total_imponible = sueldo_base_pagado + gratificacion + total_horas_extra
            afp = round(total_imponible * 0.115)
            salud = round(total_imponible * 0.07)
 
            tipo_contrato = empleado.get("tipo_contrato", "").lower()
            seguro_cesantia = round(total_imponible * 0.006) if tipo_contrato == "indefinido" else 0
 
            # FIX #25 (🚨1): descuento_asistencia ya NO se suma aquí
            total_descuentos = afp + salud + seguro_cesantia
            total_haberes = total_imponible + movilizacion + colacion
            sueldo_liquido = total_haberes - total_descuentos
 
            liquidacion = {
                "empleado_rut": rut,
                "estado_pago": "Pendiente",
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
 
            resultado = col_remuneraciones.insert_one(liquidacion)
            liquidacion["_id"] = str(resultado.inserted_id)
            liquidaciones_generadas.append(liquidacion)
 
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
 
        return {
            "id": str(liquidacion["_id"]),
            "rut": liquidacion["empleado_rut"],
            "nombre": empleado.get("nombre_completo", "") if empleado else "",
            "cargo": empleado.get("cargo", "") if empleado else "",
            "mes": liquidacion["periodo"]["mes"],
            "anio": liquidacion["periodo"]["anio"],
            "estadoPago": liquidacion.get("estado_pago", "Pendiente"),
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
            # AJUSTE #25: días ausentes para bloque separado en frontend
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
@jwt_required
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
 
        empleado = col_empleados.find_one({"rut": liquidacion["empleado_rut"]}) or {}
 
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
@jwt_required
def obtener_liquidacion_empleado(request, rut, mes, anio):
 
    if request.method != 'GET':
        return JsonResponse({
            "success": False,
            "message": "Método no permitido. Usa GET.",
            "data": None
        }, status=405)
 
    try:
        liquidacion = col_remuneraciones.find_one({
            "empleado_rut": rut,
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
@jwt_required
def obtener_remuneraciones(request, mes, anio):
 
    if request.method != 'GET':
        return JsonResponse({
            "success": False,
            "message": "Método no permitido. Usa GET.",
            "data": None
        }, status=405)
 
    try:
        liquidaciones_bd = list(col_remuneraciones.find({
            "periodo.mes": int(mes),
            "periodo.anio": int(anio)
        }))
 
        liquidaciones_frontend = []
        for liquidacion in liquidaciones_bd:
            empleado = col_empleados.find_one({"rut": liquidacion["empleado_rut"]}) or {}
            resultado = _serializar_liquidacion(liquidacion, empleado)
            if resultado:
                liquidaciones_frontend.append(resultado)
 
        return JsonResponse({
            "success": True,
            "message": "Remuneraciones obtenidas correctamente.",
            "data": liquidaciones_frontend
        }, status=200)
 
    except Exception as e:
        return JsonResponse({
            "success": False,
            "message": f"Error al obtener remuneraciones: {str(e)}",
            "data": None
        }, status=500)
 
 
@csrf_exempt
@jwt_required
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
            horas_extra_frontend.append({
                "id": str(he["_id"]),
                "rut": he.get("rut"),
                "horas": he.get("horas", 0),
                "tipo": he.get("tipo", "laboral"),
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