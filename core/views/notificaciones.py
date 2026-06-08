from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from core.jwt_middleware import jwt_required
from core.db_connection import col_notificaciones
from bson import ObjectId
import json
from datetime import datetime

def format_mongo_doc(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

@csrf_exempt
@jwt_required
def api_notificaciones(request):
    try:
        if request.method == 'GET':
            # Obtener el RUT y ROL del usuario autenticado
            usuario_rut = request.user_data.get('rut') if hasattr(request, 'user_data') else None
            rol_nombre = request.user_data.get('rol_nombre') if hasattr(request, 'user_data') else None
            
            if not usuario_rut:
                return JsonResponse({"success": False, "message": "No autorizado"}, status=401)
                
            # Recuperar notificaciones del usuario, ordenadas por fecha (más recientes primero)
            # Si es Administrador_General, puede ver TODAS las notificaciones del sistema
            query = {}
            if rol_nombre != 'Administrador_General':
                query = {
                    "$or": [
                        {"usuario_id": usuario_rut},
                        {"usuario_id": rol_nombre},
                        {"usuario_id": "global"}
                    ]
                }
                
            notificaciones = list(col_notificaciones.find(query).sort("fecha_creacion", -1))
            
            # Formatear el ObjectId y las fechas
            data = []
            for n in notificaciones:
                if isinstance(n.get('fecha_creacion'), datetime):
                    n['fecha_creacion'] = n['fecha_creacion'].isoformat()
                data.append(format_mongo_doc(n))
                
            return JsonResponse({
                "success": True, 
                "data": data, 
                "message": "Notificaciones obtenidas con éxito"
            }, status=200)
            
        else:
            return JsonResponse({"success": False, "message": "Método no permitido"}, status=405)
            
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)

@csrf_exempt
@jwt_required
def api_notificacion_estado(request, notif_id):
    try:
        if request.method == 'PATCH':
            try:
                obj_id = ObjectId(notif_id)
            except:
                return JsonResponse({"success": False, "message": "ID inválido"}, status=400)
                
            # Buscar la notificación y asegurar que pertenece al usuario (salvo que sea Admin)
            usuario_rut = request.user_data.get('rut') if hasattr(request, 'user_data') else None
            rol_nombre = request.user_data.get('rol_nombre') if hasattr(request, 'user_data') else None
            
            query = {"_id": obj_id}
            if rol_nombre != 'Administrador_General' and usuario_rut:
                query["$or"] = [
                    {"usuario_id": usuario_rut},
                    {"usuario_id": rol_nombre},
                    {"usuario_id": "global"}
                ]
                
            notificacion = col_notificaciones.find_one(query)
            if not notificacion:
                return JsonResponse({"success": False, "message": "Notificación no encontrada o sin permisos"}, status=404)
                
            # Actualizar el campo 'leida' a True
            col_notificaciones.update_one({"_id": obj_id}, {"$set": {"leida": True}})
            
            return JsonResponse({"success": True, "message": "Notificación marcada como leída"}, status=200)
            
        else:
            return JsonResponse({"success": False, "message": "Método no permitido"}, status=405)
            
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)
