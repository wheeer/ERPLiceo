from core.db_connection import col_asistencia
asistencias = list(col_asistencia.find())
print("Total asistencias:", len(asistencias))
for a in asistencias:
    print(a)
