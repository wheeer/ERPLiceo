import json
import bcrypt
import jwt
import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .db_connection import col_usuarios, col_roles, col_empleados, col_inventario
from functools import wraps


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


def jwt_required(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JsonResponse({
                "success": False,
                "message": "Token de autenticación requerido.",
                "data": None
            }, status=401)
        
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            request.user_rut = payload.get("rut")
            request.user_rol = payload.get("rol_nombre")
        except jwt.ExpiredSignatureError:
            return JsonResponse({
                "success": False,
                "message": "Sesión expirada. Vuelve a iniciar sesión.",
                "data": None
            }, status=401)
        except jwt.InvalidTokenError:
            return JsonResponse({
                "success": False,
                "message": "Token inválido.",
                "data": None
            }, status=401)
            
        return view_func(request, *args, **kwargs)
    return _wrapped_view


@csrf_exempt
@jwt_required
def inventario_list_create(request):
    if request.method == 'GET':
        try:
            # Obtener todos los artículos
            articulos = list(col_inventario.find({}, {"_id": 0}))
            return JsonResponse({
                "success": True,
                "message": "Artículos obtenidos correctamente",
                "data": articulos
            }, status=200)
        except Exception as e:
            return JsonResponse({
                "success": False,
                "message": f"Error al obtener inventario: {str(e)}",
                "data": None
            }, status=500)
            
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            codigo = data.get("codigo")
            cantidad = data.get("cantidad")
            
            if not codigo:
                return JsonResponse({"success": False, "message": "El código es obligatorio", "data": None}, status=400)
            
            # H5 - Prevención de errores: Validar cantidad
            if cantidad is None or not isinstance(cantidad, int) or cantidad < 0:
                return JsonResponse({"success": False, "message": "La cantidad debe ser un número entero mayor o igual a 0", "data": None}, status=400)
                
            # Verificar si existe el código
            existente = col_inventario.find_one({"codigo": codigo})
            if existente:
                return JsonResponse({"success": False, "message": f"Ya existe un artículo con el código {codigo}", "data": None}, status=400)
                
            nuevo_articulo = {
                "codigo": codigo,
                "nombre": data.get("nombre", "Sin nombre"),
                "categoria": data.get("categoria", "General"),
                "ubicacion": data.get("ubicacion", "Bodega"),
                "cantidad": cantidad,
                "stock_minimo": data.get("stock_minimo", 1),
                "costo_unitario": data.get("costo_unitario", 0),
                "estado": data.get("estado", "Disponible"),
                "ultimo_mantenimiento": data.get("ultimo_mantenimiento", None)
            }
            
            col_inventario.insert_one(nuevo_articulo)
            nuevo_articulo.pop("_id", None)
            
            return JsonResponse({
                "success": True,
                "message": "Artículo creado exitosamente",
                "data": nuevo_articulo
            }, status=201)
            
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "JSON inválido", "data": None}, status=400)
        except Exception as e:
            return JsonResponse({"success": False, "message": f"Error del servidor: {str(e)}", "data": None}, status=500)
            
    return JsonResponse({"success": False, "message": "Método no permitido", "data": None}, status=405)


@csrf_exempt
@jwt_required
def inventario_criticos(request):
    if request.method == 'GET':
        try:
            # H1 - Visibilidad: Filtro con lte
            query = {"$expr": {"$lte": ["$cantidad", "$stock_minimo"]}}
            criticos = list(col_inventario.find(query, {"_id": 0}))
            return JsonResponse({
                "success": True,
                "message": "Artículos críticos obtenidos correctamente",
                "data": criticos
            }, status=200)
        except Exception as e:
            return JsonResponse({
                "success": False,
                "message": f"Error al obtener artículos críticos: {str(e)}",
                "data": None
            }, status=500)
            
    return JsonResponse({"success": False, "message": "Método no permitido", "data": None}, status=405)


@csrf_exempt
@jwt_required
def inventario_detail(request, codigo):
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            
            # Buscar el artículo
            articulo = col_inventario.find_one({"codigo": codigo})
            if not articulo:
                return JsonResponse({"success": False, "message": f"Artículo {codigo} no encontrado", "data": None}, status=404)
                
            cantidad = data.get("cantidad")
            # H5 - Prevención de errores: Validar cantidad si viene en el payload
            if cantidad is not None:
                if not isinstance(cantidad, int) or cantidad < 0:
                    return JsonResponse({"success": False, "message": "La cantidad debe ser un número entero mayor o igual a 0", "data": None}, status=400)
            
            # Preparamos los datos a actualizar
            campos_actualizar = {}
            for key in ["nombre", "categoria", "ubicacion", "cantidad", "stock_minimo", "costo_unitario", "estado", "ultimo_mantenimiento"]:
                if key in data:
                    campos_actualizar[key] = data[key]
                    
            if not campos_actualizar:
                return JsonResponse({"success": False, "message": "No se enviaron campos válidos para actualizar", "data": None}, status=400)
                
            col_inventario.update_one({"codigo": codigo}, {"$set": campos_actualizar})
            
            articulo_actualizado = col_inventario.find_one({"codigo": codigo}, {"_id": 0})
            
            return JsonResponse({
                "success": True,
                "message": f"Artículo {codigo} actualizado correctamente",
                "data": articulo_actualizado
            }, status=200)
            
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "JSON inválido", "data": None}, status=400)
        except Exception as e:
            return JsonResponse({"success": False, "message": f"Error del servidor: {str(e)}", "data": None}, status=500)

    elif request.method == 'DELETE':
        try:
            # Buscar el artículo
            articulo = col_inventario.find_one({"codigo": codigo})
            if not articulo:
                return JsonResponse({"success": False, "message": f"Artículo {codigo} no encontrado", "data": None}, status=404)
                
            col_inventario.delete_one({"codigo": codigo})
            
            return JsonResponse({
                "success": True,
                "message": f"Artículo {codigo} eliminado correctamente",
                "data": None
            }, status=200)
            
        except Exception as e:
            return JsonResponse({"success": False, "message": f"Error del servidor: {str(e)}", "data": None}, status=500)
            
    return JsonResponse({"success": False, "message": "Método no permitido", "data": None}, status=405)
