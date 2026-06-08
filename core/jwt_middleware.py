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