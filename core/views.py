import json
import bcrypt
import jwt
import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .db_connection import (col_usuarios,col_roles, col_empleados, col_remuneraciones, col_horas_extra)
from bson import ObjectId
from .jwt_middleware import jwt_required
from datetime import datetime

def status_check(request):

    try:

        total_usuarios = col_usuarios.count_documents({})

        return JsonResponse({
            "success": True,
            "message": "¡Conexión ERP EMTP exitosa!",
            "data": {
                "database_status": "MongoDB Atlas conectado",
                "usuarios_registrados": total_usuarios
            }
        }, status=200)

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": "Falló la conexión a la base de datos.",
            "data": {
                "error_detail": str(e)
            }
        }, status=500)


@csrf_exempt
def login_view(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Método no permitido. Usa POST."}, status=405)

    try:
        data = json.loads(request.body)
        rut = data.get("rut")
        password = data.get("password")

        if not rut or not password:
            return JsonResponse({"error": "Faltan credenciales (RUT o Contraseña)"}, status=400)

        # Sanitización del RUT (Estándar Chileno: Sin puntos, K mayúscula)
        rut_limpio = rut.replace(".", "").upper()

        # Buscar al usuario en MongoDB
        usuario = col_usuarios.find_one({"rut": rut_limpio})

        if not usuario:
            return JsonResponse({"error": "Usuario no encontrado"}, status=404)

        # Validar contraseña con bcrypt
        stored_hash = usuario.get("password_hash")

        if not stored_hash:
            return JsonResponse({"error": "Error de seguridad en la cuenta. Contacte al administrador."}, status=401)

        if isinstance(stored_hash, str):
            stored_hash = stored_hash.encode('utf-8')

        if not bcrypt.checkpw(password.encode('utf-8'), stored_hash):
            return JsonResponse({"error": "Contraseña incorrecta"}, status=401)

        # Login exitoso: cruzar datos con la colección de empleados
        empleado = col_empleados.find_one({"rut": rut_limpio})
        nombre_completo = empleado.get("nombre_completo") if empleado else rut_limpio
        cargo = empleado.get("cargo") if empleado else "Sin cargo"
        fecha_ingreso = empleado.get("fecha_ingreso").strftime("%d/%m/%Y") if empleado and empleado.get("fecha_ingreso") else ""
        tipo_contrato = empleado.get("tipo_contrato") if empleado else ""

        # Obtener nombre del rol
        rol_document = col_roles.find_one({"_id": usuario.get("rol_id")})
        rol_nombre = rol_document.get("nombre") if rol_document else ""

        # Registrar el último acceso del usuario
        col_usuarios.update_one(
            {"rut": rut_limpio},
            {"$set": {"ultimo_acceso": datetime.datetime.now(datetime.timezone.utc)}}
        )

        # Generar Token JWT (expira en 8 horas)
        payload = {
            "rut": rut_limpio,
            "rol_nombre": rol_nombre,
            "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=8),
            "iat": datetime.datetime.now(datetime.timezone.utc)
        }

        token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

        return JsonResponse({
            "message": "Login exitoso",
            "token": token,
            "usuario": {
                "rut": rut_limpio,
                "nombre_completo": nombre_completo,
                "cargo": cargo,
                "fecha_ingreso": fecha_ingreso,
                "tipo_contrato": tipo_contrato,
                "rol_nombre": rol_nombre,
                "activo": usuario.get("activo"),
                "ultimo_acceso": datetime.datetime.now(datetime.timezone.utc).strftime("%d/%m/%Y %H:%M")
            }
        }, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def cambiar_clave_view(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Método no permitido. Usa POST."}, status=405)

    # Verificar el token JWT en el header Authorization
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return JsonResponse({"error": "Token de autenticación requerido."}, status=401)

    token = auth_header.split(" ")[1]

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        rut_del_token = payload.get("rut")
    except jwt.ExpiredSignatureError:
        return JsonResponse({"error": "Sesión expirada. Vuelve a iniciar sesión."}, status=401)
    except jwt.InvalidTokenError:
        return JsonResponse({"error": "Token inválido."}, status=401)

    try:
        data = json.loads(request.body)
        clave_actual = data.get("clave_actual")
        nueva_clave = data.get("nueva_clave")

        if not clave_actual or not nueva_clave:
            return JsonResponse({"error": "Faltan datos (clave_actual o nueva_clave)."}, status=400)

        if len(nueva_clave) < 8:
            return JsonResponse({"error": "La nueva contraseña debe tener al menos 8 caracteres."}, status=400)

        usuario = col_usuarios.find_one({"rut": rut_del_token})
        if not usuario:
            return JsonResponse({"error": "Usuario no encontrado."}, status=404)

        stored_hash = usuario.get("password_hash")
        if isinstance(stored_hash, str):
            stored_hash = stored_hash.encode('utf-8')

        if not bcrypt.checkpw(clave_actual.encode('utf-8'), stored_hash):
            return JsonResponse({"error": "La contraseña actual es incorrecta."}, status=401)

        # Generar nuevo hash y actualizar en BD
        nuevo_hash = bcrypt.hashpw(nueva_clave.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        col_usuarios.update_one(
            {"rut": rut_del_token},
            {"$set": {"password_hash": nuevo_hash}}
        )

        return JsonResponse({"message": "Contraseña actualizada correctamente."}, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    
# Acá se agregarán los endpoints relacionados con remuneraciones, horas extra y generación de PDF, todos protegidos con JWT.#

# Endpoint de remuneraciones - Jasna #

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

        # VALIDAR SI YA EXISTEN LIQUIDACIONES

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

        empleados = list(col_empleados.find())

        liquidaciones_generadas = []

        # PORCENTAJES AFP

        porcentajes_afp = {
            "ProVida": 0.1145,
            "Habitat": 0.1127,
            "Capital": 0.1144,
            "Modelo": 0.1058,
            "Cuprum": 0.1144
        }

        for empleado in empleados:

            rut = empleado["rut"]

            # CONFIGURACION REMUNERACION

            config = empleado.get("config_remuneracion", {})

            sueldo_base = config.get("sueldo_base", 0)

            movilizacion = config.get("movilizacion", 0)

            colacion = config.get("colacion", 0)

            afp_nombre = config.get("afp", "ProVida")

            salud_nombre = config.get("salud", "Fonasa")

            salud_porcentaje = config.get(
                "salud_porcentaje",
                0.07
            )

            # GRATIFICACION LEGAL CON TOPE

            gratificacion = min(
                round(sueldo_base * 0.25),
                205000
            )

            # HORAS EXTRA

            horas_extra_empleado = list(
                col_horas_extra.find({
                    "rut_empleado": rut,
                    "mes": int(mes),
                    "anio": int(anio)
                })
            )

            valor_hora = sueldo_base / 180

            total_horas_extra = 0

            cantidad_horas_extra = 0

            for hora_extra in horas_extra_empleado:

                horas = hora_extra.get(
                    "cantidad_horas",
                    0
                )

                cantidad_horas_extra += horas

                total_horas_extra += round(
                    horas * valor_hora * 1.5
                )

            # TOTAL IMPONIBLE

            total_imponible = (
                sueldo_base +
                gratificacion +
                total_horas_extra
            )

            # AFP

            porcentaje_afp = porcentajes_afp.get(
                afp_nombre,
                0.1145
            )

            afp = round(
                total_imponible * porcentaje_afp
            )

            # SALUD

            salud = round(
                total_imponible * salud_porcentaje
            )

            # SEGURO CESANTIA

            tipo_contrato = empleado.get(
                "tipo_contrato",
                ""
            ).lower()

            if tipo_contrato == "indefinido":

                seguro_cesantia = round(
                    total_imponible * 0.006
                )

            else:

                seguro_cesantia = 0

            # TOTALES

            total_descuentos = (
                afp +
                salud +
                seguro_cesantia
            )

            total_haberes = (
                total_imponible +
                movilizacion +
                colacion
            )

            sueldo_liquido = (
                total_haberes -
                total_descuentos
            )

            # DOCUMENTO MONGODB

            liquidacion = {

                "empleado_rut": rut,

                "periodo": {
                    "mes": int(mes),
                    "anio": int(anio)
                },

                "empleado": {

                    "nombre": empleado.get(
                        "nombre_completo",
                        ""
                    ),

                    "cargo": empleado.get(
                        "cargo",
                        ""
                    ),

                    "tipo_contrato": empleado.get(
                        "tipo_contrato",
                        ""
                    )
                },

                "haberes": {

                    "imponibles": {

                        "sueldo_base": sueldo_base,

                        "gratificacion_legal": gratificacion,

                        "horas_extra": {

                            "cantidad": cantidad_horas_extra,

                            "monto": total_horas_extra
                        }
                    },

                    "no_imponibles": {

                        "movilizacion": movilizacion,

                        "colacion": colacion
                    }
                },

                "descuentos_legales": {

                    "afp": {

                        "nombre": afp_nombre,

                        "monto": afp
                    },

                    "salud": {

                        "nombre": salud_nombre,

                        "monto": salud
                    },

                    "seguro_cesantia": {

                        "monto": seguro_cesantia
                    }
                },

                "totales": {

                    "total_haberes": total_haberes,

                    "total_descuentos": total_descuentos,

                    "sueldo_liquido": sueldo_liquido
                },

                "fecha_generacion": datetime.now()
            }

            resultado = col_remuneraciones.insert_one(
                liquidacion
            )

            liquidacion["_id"] = str(
                resultado.inserted_id
            )

            liquidaciones_generadas.append(
                liquidacion
            )

        return JsonResponse({
            "success": True,
            "message": "Remuneraciones calculadas correctamente.",
            "data": liquidaciones_generadas
        }, status=201)

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": f"Error al calcular remuneraciones: {str(e)}",
            "data": None
        }, status=500)
    
    # API datos PDF liquidación - Jasna #

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

        # VALIDAR OBJECTID

        if not ObjectId.is_valid(id):

            return JsonResponse({
                "success": False,
                "message": "ID de liquidación inválido.",
                "data": None
            }, status=400)

        # CONSULTA MONGODB

        liquidacion = col_remuneraciones.find_one({
            "_id": ObjectId(id)
        })

        if not liquidacion:

            return JsonResponse({
                "success": False,
                "message": "Liquidación no encontrada.",
                "data": None
            }, status=404)

        # BUSCAR EMPLEADO

        empleado = col_empleados.find_one({
            "rut": liquidacion["empleado_rut"]
        })

        if not empleado:
            empleado = {}

        # BACKEND COMO TRADUCTOR
        # Mongo estructurado -> Angular plano

        liquidacion_frontend = {

            "id": str(liquidacion["_id"]),

            "rut": liquidacion["empleado_rut"],

            "nombre": empleado.get("nombre_completo", ""),

            "cargo": empleado.get("cargo", ""),

            "mes": liquidacion["periodo"]["mes"],

            "anio": liquidacion["periodo"]["anio"],

            "sueldoBase": liquidacion["haberes"]["imponibles"]["sueldo_base"],

            "gratificacion": liquidacion["haberes"]["imponibles"]["gratificacion_legal"],

            "horasExtra": (
                liquidacion["haberes"]["imponibles"]["horas_extra"]["monto"]
                if isinstance(
                    liquidacion["haberes"]["imponibles"]["horas_extra"],
                    dict
                )
                else liquidacion["haberes"]["imponibles"]["horas_extra"]
            ),

            "movilizacion": liquidacion["haberes"]["no_imponibles"]["movilizacion"],

            "colacion": liquidacion["haberes"]["no_imponibles"]["colacion"],

            "afp": (
                liquidacion["descuentos_legales"]["afp"]["monto"]
                if isinstance(
                    liquidacion["descuentos_legales"]["afp"],
                    dict
                )
                else liquidacion["descuentos_legales"]["afp"]
            ),

            "salud": (
                liquidacion["descuentos_legales"]["salud"]["monto"]
                if isinstance(
                    liquidacion["descuentos_legales"]["salud"],
                    dict
                )
                else liquidacion["descuentos_legales"]["salud"]
            ),

            "seguroCesantia": (
                liquidacion["descuentos_legales"]["seguro_cesantia"]["monto"]
                if isinstance(
                    liquidacion["descuentos_legales"]["seguro_cesantia"],
                    dict
                )
                else liquidacion["descuentos_legales"]["seguro_cesantia"]
            ),

            "totalHaberes": liquidacion["totales"]["total_haberes"],

            "totalDescuentos": liquidacion["totales"]["total_descuentos"],

            "neto": liquidacion["totales"]["sueldo_liquido"]
        }

        return JsonResponse({
            "success": True,
            "message": "Datos PDF obtenidos correctamente.",
            "data": liquidacion_frontend
        }, status=200)

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": f"Error al obtener datos PDF: {str(e)}",
            "data": None
        }, status=500)
    
# API liquidación por empleado - Jasna #

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

        # CONSULTA REAL MONGODB

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

        # BUSCAR DATOS EMPLEADO

        empleado = col_empleados.find_one({
            "rut": rut
        })

        # BACKEND COMO TRADUCTOR
        # Mongo estructurado -> Angular plano

        liquidacion_frontend = {

            "id": str(liquidacion["_id"]),

            "rut": liquidacion["empleado_rut"],

            "nombre": empleado.get("nombre_completo", ""),

            "cargo": empleado.get("cargo", ""),

            "mes": liquidacion["periodo"]["mes"],

            "anio": liquidacion["periodo"]["anio"],

            "sueldoBase": liquidacion["haberes"]["imponibles"]["sueldo_base"],

            "gratificacion": liquidacion["haberes"]["imponibles"]["gratificacion_legal"],

            "horasExtra": (
    liquidacion["haberes"]["imponibles"]["horas_extra"]["monto"]
    if isinstance(liquidacion["haberes"]["imponibles"]["horas_extra"], dict)
    else liquidacion["haberes"]["imponibles"]["horas_extra"]
),

            "movilizacion": liquidacion["haberes"]["no_imponibles"]["movilizacion"],

            "colacion": liquidacion["haberes"]["no_imponibles"]["colacion"],

            "afp": ( liquidacion["descuentos_legales"]["afp"]["monto"]
             if isinstance(liquidacion["descuentos_legales"]["afp"], dict)
             else liquidacion["descuentos_legales"]["afp"] ),

            "salud": ( liquidacion["descuentos_legales"]["salud"]["monto"]
             if isinstance(liquidacion["descuentos_legales"]["salud"], dict)
             else liquidacion["descuentos_legales"]["salud"]),

           "seguroCesantia": ( liquidacion["descuentos_legales"]["seguro_cesantia"]["monto"]
              if isinstance(liquidacion["descuentos_legales"]["seguro_cesantia"], dict)
              else liquidacion["descuentos_legales"]["seguro_cesantia"] ),

            "totalHaberes": liquidacion["totales"]["total_haberes"],

            "totalDescuentos": liquidacion["totales"]["total_descuentos"],

            "neto": liquidacion["totales"]["sueldo_liquido"]
        }

        return JsonResponse({
            "success": True,
            "message": "Liquidación obtenida correctamente.",
            "data": liquidacion_frontend
        }, status=200)

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": f"Error al obtener liquidación: {str(e)}",
            "data": None
        }, status=500)
    
    # API módulo remuneraciones - Jasna #

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

        # CONSULTA MONGODB REAL

        liquidaciones_bd = list(
            col_remuneraciones.find({
                "periodo.mes": int(mes),
                "periodo.anio": int(anio)
            })
        )

        liquidaciones_frontend = []

        # BACKEND COMO TRADUCTOR
        # Mongo estructurado -> Angular plano

        for liquidacion in liquidaciones_bd:

            empleado = col_empleados.find_one({
                "rut": liquidacion["empleado_rut"]
            })

            liquidaciones_frontend.append({

                "id": str(liquidacion["_id"]),

                "rut": liquidacion["empleado_rut"],

                "nombre": empleado.get("nombre_completo", ""),

                "cargo": empleado.get("cargo", ""),

                "mes": liquidacion["periodo"]["mes"],

                "anio": liquidacion["periodo"]["anio"],

                "sueldoBase": liquidacion["haberes"]["imponibles"]["sueldo_base"],

                "gratificacion": liquidacion["haberes"]["imponibles"]["gratificacion_legal"],

               "horasExtra": liquidacion["haberes"]["imponibles"]["horas_extra"]["monto"],

                "movilizacion": liquidacion["haberes"]["no_imponibles"]["movilizacion"],

                "colacion": liquidacion["haberes"]["no_imponibles"]["colacion"],

               "afp": liquidacion["descuentos_legales"]["afp"]["monto"],

               "salud": liquidacion["descuentos_legales"]["salud"]["monto"],

                "seguroCesantia": liquidacion["descuentos_legales"]["seguro_cesantia"],

                "totalHaberes": liquidacion["totales"]["total_haberes"],

                "totalDescuentos": liquidacion["totales"]["total_descuentos"],

                "neto": liquidacion["totales"]["sueldo_liquido"]
            })

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
    
    # API módulo horas extra - Jasna #

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

        # OBTENER HORAS EXTRA DEL PERÍODO

        horas_extra_bd = list(
            col_horas_extra.find({
                "mes": int(mes),
                "anio": int(anio)
            })
        )

        horas_extra_frontend = []

        # BACKEND COMO TRADUCTOR
        # Mongo -> Angular

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