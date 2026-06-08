import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Cargar las variables del archivo .env
load_dotenv()

# Obtener la URI de conexión desde el archivo .env (nunca escribir la contraseña aquí)
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "erp_emtp_db")

# Crear el cliente de conexión (el "puente" hacia MongoDB)
client = MongoClient(MONGO_URI)

# Seleccionar la base de datos del ERP
db = client[MONGO_DB_NAME]

# --- Colecciones disponibles ---
# Úsalas así en cualquier parte del código:
# from core.db_connection import db
# db.usuarios.find_one({"email": "admin@liceo.cl"})

col_usuarios = db["usuarios"]
col_empleados = db["empleados"]
col_asistencia = db["asistencia"]
col_remuneraciones = db["remuneraciones"]
col_inventario = db["inventario"]
col_roles = db["roles"]
col_horas_extra = db["horas_extra"]
col_auditoria = db["auditoria"]
col_notificaciones = db["notificaciones"]

from datetime import datetime, UTC

def registrar_auditoria(usuario_rut, usuario_nombre, modulo, accion, descripcion):
    """
    Función modular para registrar cualquier actividad en el sistema.
    Debe ser importada y llamada por otros módulos cuando realicen acciones importantes.
    """
    log_entry = {
        "usuario_rut": usuario_rut,
        "usuario_nombre": usuario_nombre,
        "modulo": modulo,
        "accion": accion,
        "descripcion": descripcion,
        "timestamp": datetime.now(UTC)
    }
    col_auditoria.insert_one(log_entry)
    
    # NUEVO: Convertir auditoría a notificación para que la campana muestre la misma info
    mensaje = f"{usuario_nombre} [{accion}] - {descripcion}"
    
    tipo_notif = "Informativa"
    if "Crítico" in accion or "Crítico" in descripcion or "crítico" in descripcion.lower():
        tipo_notif = "Stock Crítico"
    elif "Eliminado" in accion or "Desvinculado" in accion or "Impago" in accion:
        tipo_notif = "Urgente"
    elif "Registrado" in accion or "Actualizado" in accion or "Generada" in accion or "Añadidas" in accion:
        tipo_notif = "Éxito"
        
    url_destino = f"/app/{modulo}" if modulo else "#"
    
    despachar_notificacion_sistema(mensaje, modulo, tipo=tipo_notif, url_destino=url_destino)

def crear_notificacion(usuario_rut, mensaje, modulo, url_destino="#", tipo="Informativa"):
    """
    Guarda una notificación en la base de datos para asegurar su persistencia.
    """
    notificacion = {
        "usuario_id": usuario_rut,
        "mensaje": mensaje,
        "modulo": modulo,
        "tipo": tipo,
        "url_destino": url_destino,
        "leida": False,
        "fecha_creacion": datetime.now(UTC)
    }
    col_notificaciones.insert_one(notificacion)
    return notificacion

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def despachar_notificacion_sistema(mensaje, modulo, tipo="Informativa", url_destino="#"):
    """
    Guarda una sola notificación para el rol correspondiente y lanza el evento WebSocket.
    El Administrador ve todas (por query {}), los Encargados ven las de su rol.
    """
    rol_destino = "global"
    if modulo == "inventario":
        rol_destino = "Encargado_Bodega"
    elif modulo == "rrhh":
        rol_destino = "Encargado_RRHH"
    elif modulo == "remuneraciones":
        rol_destino = "Encargado_Remuneraciones"
        
    crear_notificacion(rol_destino, mensaje, modulo, url_destino, tipo)
    
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            "notifications_group",
            {
                "type": "notification_message",
                "mensaje": mensaje,
                "modulo": modulo,
                "url_destino": url_destino,
                "tipo": tipo
            }
        )
