import sys, os
import django

# Asegurar que se cargue la configuración de Django (para usar db_connection)
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.db_connection import col_asistencia
from datetime import datetime

# Borrar registros creados el 7 de junio (String o Datetime)
res1 = col_asistencia.delete_many({"fecha": "2026-06-07"})
res2 = col_asistencia.delete_many({"fecha": datetime(2026, 6, 7, 0, 0, 0)})

print(f"Éxito. Registros borrados (formato texto): {res1.deleted_count}")
print(f"Éxito. Registros borrados (formato fecha): {res2.deleted_count}")
