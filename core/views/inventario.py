import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from core.db_connection import col_inventario, col_empleados, registrar_auditoria
from core.jwt_middleware import jwt_required

@csrf_exempt
@jwt_required
def inventario_lista(request):
    if request.method == 'GET':
        try:
            items = list(col_inventario.find({}))
            # Convert ObjectId to string for JSON serialization
            for item in items:
                item['_id'] = str(item['_id'])
            return JsonResponse({
                "success": True,
                "message": "Inventario obtenido correctamente",
                "data": items
            }, status=200)
        except Exception as e:
            return JsonResponse({
                "success": False,
                "message": str(e),
                "data": None
            }, status=500)

    elif request.method == 'POST':
        try:
            body = json.loads(request.body)
            codigo = body.get('codigo')
            if not codigo:
                return JsonResponse({"success": False, "message": "El código es obligatorio", "data": None}, status=400)
            
            existe = col_inventario.find_one({"codigo": codigo})
            if existe:
                return JsonResponse({"success": False, "message": "Ya existe un artículo con ese código", "data": None}, status=400)
            
            nuevo_articulo = {
                "codigo": codigo,
                "nombre": body.get("nombre", ""),
                "categoria": body.get("categoria", ""),
                "ubicacion": body.get("ubicacion", ""),
                "stock_total": body.get("stock_total", 0),
                "stock_disponible": body.get("stock_disponible", 0),
                "stock_reparacion": body.get("stock_reparacion", 0),
                "stock_baja": body.get("stock_baja", 0),
                "stock_minimo": body.get("stock_minimo", 0),
                "costo_unitario": body.get("costo_unitario", 0),
                "estado": body.get("estado", "Disponible"),
                "ultimo_mantenimiento": body.get("ultimo_mantenimiento"),
                "incidencias": body.get("incidencias", [])
            }
            
            resultado = col_inventario.insert_one(nuevo_articulo)
            nuevo_articulo['_id'] = str(resultado.inserted_id)
            
            actor_rut = request.user_data.get('rut', 'Sistema') if hasattr(request, 'user_data') else 'Sistema'
            actor_emp = col_empleados.find_one({"rut": actor_rut})
            actor_nombre = actor_emp.get("nombre_completo", actor_rut) if actor_emp else actor_rut
            
            registrar_auditoria(
                usuario_rut=actor_rut,
                usuario_nombre=actor_nombre,
                modulo="inventario",
                accion="Ítem Registrado",
                descripcion=f"Se agregó el ítem '{nuevo_articulo.get('nombre', '')}' ({codigo}) al inventario."
            )
            
            return JsonResponse({
                "success": True,
                "message": "Artículo creado correctamente",
                "data": nuevo_articulo
            }, status=201)
        except Exception as e:
            return JsonResponse({
                "success": False,
                "message": str(e),
                "data": None
            }, status=500)
    else:
        return JsonResponse({"success": False, "message": "Método no permitido", "data": None}, status=405)


@csrf_exempt
@jwt_required
def inventario_criticos(request):
    if request.method == 'GET':
        try:
            # Encuentra items donde stock_disponible <= stock_minimo o estado es Crítico
            items = list(col_inventario.find({
                "$or": [
                    {"$expr": { "$lte": ["$stock_disponible", "$stock_minimo"] }},
                    {"estado": "Crítico"}
                ]
            }))
            
            for item in items:
                item['_id'] = str(item['_id'])
                
            return JsonResponse({
                "success": True,
                "message": "Artículos críticos obtenidos correctamente",
                "data": items
            }, status=200)
        except Exception as e:
            return JsonResponse({
                "success": False,
                "message": str(e),
                "data": None
            }, status=500)
    else:
        return JsonResponse({"success": False, "message": "Método no permitido", "data": None}, status=405)


@csrf_exempt
@jwt_required
def inventario_detalle(request, codigo):
    if request.method == 'PUT':
        try:
            body = json.loads(request.body)
            existe = col_inventario.find_one({"codigo": codigo})
            if not existe:
                return JsonResponse({"success": False, "message": "Artículo no encontrado", "data": None}, status=404)
            
            # Lógica automática para stock e incidencias
            stock_disponible_old = int(existe.get("stock_disponible", 0))
            stock_reparacion_old = int(existe.get("stock_reparacion", 0))
            stock_baja_old = int(existe.get("stock_baja", 0))
            incidencias = existe.get("incidencias", [])

            stock_reparacion_new = int(body.get("stock_reparacion", stock_reparacion_old))
            stock_baja_new = int(body.get("stock_baja", stock_baja_old))
            stock_disponible_new = int(body.get("stock_disponible", stock_disponible_old))
            
            # Automatización: Si vuelve de reparación a disponible, certificar el mantenimiento
            if stock_reparacion_new < stock_reparacion_old and stock_disponible_new > stock_disponible_old:
                body["ultimo_mantenimiento"] = datetime.now().strftime("%Y-%m-%d")
            
            actor_rut = request.user_data.get('rut', 'Sistema') if hasattr(request, 'user_data') else 'Sistema'
            actor_emp = col_empleados.find_one({"rut": actor_rut})
            actor_nombre = actor_emp.get("nombre_completo", actor_rut) if actor_emp else actor_rut
            
            if stock_reparacion_new > stock_reparacion_old:
                diff = stock_reparacion_new - stock_reparacion_old
                incidencias.append({
                    "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "tipo": "Reparación",
                    "cantidad": diff,
                    "detalle": f"Pasado a reparación por {actor_nombre}"
                })

            if stock_baja_new > stock_baja_old:
                diff = stock_baja_new - stock_baja_old
                incidencias.append({
                    "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "tipo": "Baja",
                    "cantidad": diff,
                    "detalle": f"Dado de baja por {actor_nombre}"
                })
                
            if stock_disponible_new != stock_disponible_old:
                diff = abs(stock_disponible_new - stock_disponible_old)
                incidencias.append({
                    "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "tipo": "Ajuste",
                    "cantidad": diff,
                    "detalle": f"Ajuste manual de stock por {actor_nombre}"
                })

            body["stock_disponible"] = stock_disponible_new
            body["stock_reparacion"] = stock_reparacion_new
            body["stock_baja"] = stock_baja_new
            body["stock_total"] = stock_disponible_new + stock_reparacion_new + stock_baja_new
            body["incidencias"] = incidencias

            campos_actualizar = {}
            for campo in ["nombre", "categoria", "ubicacion", "stock_total", "stock_disponible", "stock_reparacion", "stock_baja", "stock_minimo", "costo_unitario", "estado", "ultimo_mantenimiento", "incidencias"]:
                if campo in body:
                    campos_actualizar[campo] = body[campo]
                    
            if campos_actualizar:
                col_inventario.update_one({"codigo": codigo}, {"$set": campos_actualizar})
                
            actualizado = col_inventario.find_one({"codigo": codigo})
            actualizado['_id'] = str(actualizado['_id'])
            
            registrar_auditoria(
                usuario_rut=actor_rut,
                usuario_nombre=actor_nombre,
                modulo="inventario",
                accion="Stock Actualizado",
                descripcion=f"Se actualizó la información/stock del ítem {codigo}."
            )
            
            return JsonResponse({
                "success": True,
                "message": "Artículo actualizado correctamente",
                "data": actualizado
            }, status=200)
        except Exception as e:
            return JsonResponse({
                "success": False,
                "message": str(e),
                "data": None
            }, status=500)

    elif request.method == 'DELETE':
        try:
            existe = col_inventario.find_one({"codigo": codigo})
            if not existe:
                return JsonResponse({"success": False, "message": "Artículo no encontrado", "data": None}, status=404)
                
            col_inventario.delete_one({"codigo": codigo})
            
            actor_rut = request.user_data.get('rut', 'Sistema') if hasattr(request, 'user_data') else 'Sistema'
            actor_emp = col_empleados.find_one({"rut": actor_rut})
            actor_nombre = actor_emp.get("nombre_completo", actor_rut) if actor_emp else actor_rut
            
            registrar_auditoria(
                usuario_rut=actor_rut,
                usuario_nombre=actor_nombre,
                modulo="inventario",
                accion="Ítem Eliminado",
                descripcion=f"Se eliminó el registro del ítem {codigo}."
            )
            
            return JsonResponse({
                "success": True,
                "message": "Artículo eliminado correctamente",
                "data": None
            }, status=200)
        except Exception as e:
            return JsonResponse({
                "success": False,
                "message": str(e),
                "data": None
            }, status=500)
    else:
        return JsonResponse({"success": False, "message": "Método no permitido", "data": None}, status=405)
