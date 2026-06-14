import jwt

from django.conf import settings
from django.http import JsonResponse


def jwt_required(view_func):

    def wrapper(request, *args, **kwargs):

        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return JsonResponse({
                "success": False,
                "message": "Token no proporcionado."
            }, status=401)

        try:

            token = auth_header.split(' ')[1]

            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"]
            )
            
            # Verificar si se implementó el nuevo esquema "type"
            if payload.get("type") == "refresh":
                return JsonResponse({
                    "success": False,
                    "message": "Tipo de token inválido para autorización (Use access_token)."
                }, status=401)

            request.user_data = payload

        except jwt.ExpiredSignatureError:
            return JsonResponse({
                "success": False,
                "message": "Token expirado."
            }, status=401)

        except jwt.InvalidTokenError:
            return JsonResponse({
                "success": False,
                "message": "Token inválido."
            }, status=401)

        return view_func(request, *args, **kwargs)

    return wrapper

def role_required(*allowed_roles):
    """
    Decorador que verifica si el usuario autenticado tiene uno de los roles permitidos.
    Debe usarse siempre DEBAJO de @jwt_required (o incluir su lógica).
    """
    def decorator(view_func):
        # Primero aseguramos que pase la validación del JWT
        @jwt_required
        def wrapper(request, *args, **kwargs):
            # Obtener el rol decodificado del token
            user_role = request.user_data.get('rol_nombre')
            
            if not user_role or user_role not in allowed_roles:
                return JsonResponse({
                    "success": False,
                    "message": f"Acceso denegado. Rol insuficiente. Se requiere uno de: {', '.join(allowed_roles)}"
                }, status=403)
                
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator