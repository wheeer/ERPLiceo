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

