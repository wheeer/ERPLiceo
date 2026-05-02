import json
import bcrypt
import jwt
import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .db_connection import col_usuarios, col_roles, col_empleados


def status_check(request):
    try:
        total_usuarios = col_usuarios.count_documents({})
        return JsonResponse({
            "status": "online",
            "message": "¡Conexión ERP EMTP exitosa!",
            "database_status": "MongoDB Atlas conectado",
            "usuarios_registrados": total_usuarios
        })
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": "Fallo la conexión a la base de datos",
            "error_detail": str(e)
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
