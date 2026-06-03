from django.http import JsonResponse
from datetime import datetime, timedelta, UTC
from core.db_connection import col_empleados, col_inventario, col_asistencia, col_auditoria
from core.jwt_middleware import jwt_required
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
@jwt_required
def api_dashboard_resumen(request):
    """
    Retorna métricas clave para el Dashboard de Administrador y Directivo.
    """
    try:
        if request.method != 'GET':
            return JsonResponse({"error": "Método no permitido"}, status=405)

        # 1. Total Personal Activo
        empleados_activos = col_empleados.count_documents({"estado": "activo"})

        # 2. Artículos con Stock Crítico (Fórmula modular alineada a inventario.py)
        articulos_criticos = col_inventario.count_documents({
            "$or": [
                {"$expr": { "$lte": ["$stock_disponible", "$stock_minimo"] }},
                {"estado": "Crítico"}
            ]
        })

        # 3. Ausencias (últimos 30 días)
        hace_30_dias = datetime.now(UTC) - timedelta(days=30)
        ausencias_mes = col_asistencia.count_documents({
            "estado": "Ausente",
            "fecha": {"$gte": hace_30_dias}
        })

        data = {
            "empleados_activos": empleados_activos,
            "articulos_criticos": articulos_criticos,
            "ausencias_mes": ausencias_mes
        }
        
        return JsonResponse(data, status=200)

    except Exception as e:
        return JsonResponse(
            {"error": "Error interno al obtener resumen del dashboard", "detalle": str(e)},
            status=500
        )

@csrf_exempt
@jwt_required
def api_dashboard_actividades(request):
    """
    Retorna el timeline de actividades recientes del sistema (Auditoría).
    Trae los últimos 6 registros ordenados por fecha descendente.
    """
    try:
        if request.method != 'GET':
            return JsonResponse({"error": "Método no permitido"}, status=405)

        # Buscar los últimos 6 logs
        logs = list(col_auditoria.find().sort("timestamp", -1).limit(6))
        
        # Mapear al formato que espera el frontend (ActivityLog)
        data = []
        for i, log in enumerate(logs):
            data.append({
                "id": str(log.get("_id", i)),
                "type": "update" if log.get("accion") == "Stock Corregido" or log.get("accion") == "Nómina Actualizada" else
                        "create" if "Registrado" in log.get("accion") or "Nuevo" in log.get("accion") or "Firmado" in log.get("accion") else
                        "login" if log.get("accion") == "Inicio de Sesión" else
                        "export" if "Exportado" in log.get("accion") else "update",
                "action": log.get("accion"),
                "description": log.get("descripcion"),
                "module": log.get("modulo", "auth"),
                "user": log.get("usuario_nombre", "Desconocido"),
                "timestamp": log.get("timestamp", datetime.now(UTC))
            })

        return JsonResponse({"success": True, "data": data}, status=200)

    except Exception as e:
        return JsonResponse(
            {"error": "Error al cargar el timeline de actividades", "detalle": str(e)},
            status=500
        )
