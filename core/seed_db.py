import os
import sys
import django
import bcrypt
from datetime import datetime, UTC

# ─── Configuración del entorno Django ────────────────────────────────────────
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.db_connection import (
    db, col_roles, col_usuarios, col_empleados,
    col_asistencia, col_inventario, col_remuneraciones
)

# =============================================================================
# SCRIPT DE SEEDEO — ERP EMTP (Liceo Técnico Profesional)
# Genera datos simulados realistas para pruebas del equipo.
# ⚠️  ADVERTENCIA: Este script BORRA y RECREA toda la base de datos.
# Ejecutar con: python core/seed_db.py
# =============================================================================

def run_seed():
    print("\n" + "═"*55)
    print("  🌱  SEED ERP EMTP — Iniciando población de datos...")
    print("═"*55 + "\n")

    # ── 0. Limpiar colecciones ─────────────────────────────────────────────────
    print("🧹 Limpiando colecciones existentes...")
    for col in [col_roles, col_usuarios, col_empleados,
                col_asistencia, col_inventario, col_remuneraciones]:
        col.delete_many({})
    print("   ✔ Colecciones limpias.\n")

    # ── 1. Roles ───────────────────────────────────────────────────────────────
    print("🛡️  Creando Roles del sistema...")
    roles_data = [
        {
            "nombre": "Administrador_General",
            "descripcion": "Acceso total al sistema. Para el Director o Sostenedor.",
            "permisos": ["all"]
        },
        {
            "nombre": "Encargado_RRHH",
            "descripcion": "Gestiona fichas de empleados y control de asistencia.",
            "permisos": ["read_rrhh", "write_rrhh"]
        },
        {
            "nombre": "Encargado_Remuneraciones",
            "descripcion": "Calcula sueldos, imposiciones y emite liquidaciones.",
            "permisos": ["read_remuneraciones", "write_remuneraciones"]
        },
        {
            "nombre": "Encargado_Bodega",
            "descripcion": "Gestiona el inventario de talleres e insumos.",
            "permisos": ["read_inventario", "write_inventario"]
        }
    ]
    col_roles.insert_many(roles_data)
    # Mapa nombre → _id para referencias
    roles_map = {r["nombre"]: r["_id"] for r in roles_data}
    print(f"   ✔ {len(roles_data)} roles creados.\n")

    # ── 2. Usuarios de acceso ──────────────────────────────────────────────────
    print("👤 Creando Usuarios de acceso (solo administrativos) con contraseñas encriptadas...")
    
    # Función de ayuda para encriptar
    def hash_password(plain_text_password):
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(plain_text_password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    usuarios_data = [
        {
            "rut": "11111111-1",
            "password_hash": hash_password("admin123"),
            "rol_id": roles_map["Administrador_General"],
            "activo": True,
            "ultimo_acceso": None,
            "creado_en": datetime.now(UTC)
        },
        {
            "rut": "22222222-2",
            "password_hash": hash_password("rrhh2026"),
            "rol_id": roles_map["Encargado_RRHH"],
            "activo": True,
            "ultimo_acceso": None,
            "creado_en": datetime.now(UTC)
        },
        {
            "rut": "33333333-3",
            "password_hash": hash_password("remun2026"),
            "rol_id": roles_map["Encargado_Remuneraciones"],
            "activo": True,
            "ultimo_acceso": None,
            "creado_en": datetime.now(UTC)
        },
        {
            "rut": "44444444-4",
            "password_hash": hash_password("bodega2026"),
            "rol_id": roles_map["Encargado_Bodega"],
            "activo": True,
            "ultimo_acceso": None,
            "creado_en": datetime.now(UTC)
        }
    ]
    col_usuarios.insert_many(usuarios_data)
    print(f"   ✔ {len(usuarios_data)} usuarios creados.\n")

    # ── 3. Empleados ───────────────────────────────────────────────────────────
    print("💼 Creando Empleados (ecosistema realista)...")
    empleados_data = [
        # Administración General
        {
            "rut": "11111111-1",
            "nombre_completo": "Walter Hollub",
            "cargo": "Administrador del Sistema",
            "tipo_contrato": "Indefinido",
            "fecha_ingreso": datetime(2018, 3, 1, tzinfo=UTC),
            "config_remuneracion": {
                "sueldo_base": 1800000,
                "afp": "Habitat",
                "salud": "Isapre Cruz Blanca",
                "movilizacion": 50000,
                "colacion": 55000
            },
            "activo": True,
            "actualizado_en": datetime.now(UTC)
        },
        # RRHH
        {
            "rut": "22222222-2",
            "nombre_completo": "Jordan Acevedo",
            "cargo": "Jefe de Recursos Humanos",
            "tipo_contrato": "Indefinido",
            "fecha_ingreso": datetime(2020, 8, 1, tzinfo=UTC),
            "config_remuneracion": {
                "sueldo_base": 950000,
                "afp": "Capital",
                "salud": "Fonasa",
                "movilizacion": 45000,
                "colacion": 50000
            },
            "activo": True,
            "actualizado_en": datetime.now(UTC)
        },
        # Remuneraciones
        {
            "rut": "33333333-3",
            "nombre_completo": "Jasna Ramírez",
            "cargo": "Encargada de Remuneraciones",
            "tipo_contrato": "Indefinido",
            "fecha_ingreso": datetime(2021, 5, 1, tzinfo=UTC),
            "config_remuneracion": {
                "sueldo_base": 900000,
                "afp": "Modelo",
                "salud": "Fonasa",
                "movilizacion": 40000,
                "colacion": 50000
            },
            "activo": True,
            "actualizado_en": datetime.now(UTC)
        },
        # Bodega
        {
            "rut": "44444444-4",
            "nombre_completo": "Juan Pablo Hernández",
            "cargo": "Encargado de Bodega",
            "tipo_contrato": "Plazo Fijo",
            "fecha_ingreso": datetime(2023, 3, 15, tzinfo=UTC),
            "config_remuneracion": {
                "sueldo_base": 680000,
                "afp": "PlanVital",
                "salud": "Fonasa",
                "movilizacion": 40000,
                "colacion": 45000
            },
            "activo": True,
            "actualizado_en": datetime.now(UTC)
        },
        # Docentes (Sin acceso al sistema, solo registran asistencia)
        {
            "rut": "55555555-5",
            "nombre_completo": "Valentina Torres Álvarez",
            "cargo": "Docente Especialidad Electromecánica",
            "tipo_contrato": "Indefinido",
            "fecha_ingreso": datetime(2019, 3, 1, tzinfo=UTC),
            "config_remuneracion": {
                "sueldo_base": 820000,
                "afp": "ProVida",
                "salud": "Fonasa",
                "movilizacion": 42000,
                "colacion": 48000
            },
            "activo": True,
            "actualizado_en": datetime.now(UTC)
        },
        {
            "rut": "55555555-5",
            "nombre_completo": "Marcelo Fuentes Díaz",
            "cargo": "Docente Especialidad Informática",
            "tipo_contrato": "Indefinido",
            "fecha_ingreso": datetime(2021, 3, 1, tzinfo=UTC),
            "config_remuneracion": {
                "sueldo_base": 800000,
                "afp": "Modelo",
                "salud": "Isapre Banmédica",
                "movilizacion": 40000,
                "colacion": 45000
            },
            "activo": True,
            "actualizado_en": datetime.now(UTC)
        },
        # Sin acceso al sistema (solo en empleados, sin usuario)
        {
            "rut": "66666666-6",
            "nombre_completo": "Ana Tijoux Merino",
            "cargo": "Psicóloga Convivencia Escolar",
            "tipo_contrato": "Part-time",
            "fecha_ingreso": datetime(2022, 9, 1, tzinfo=UTC),
            "config_remuneracion": {
                "sueldo_base": 620000,
                "afp": "Uno",
                "salud": "Fonasa",
                "movilizacion": 35000,
                "colacion": 40000
            },
            "activo": True,
            "actualizado_en": datetime.now(UTC)
        },
        {
            "rut": "77777777-7",
            "nombre_completo": "María Soto Pinilla",
            "cargo": "Auxiliar de Aseo",
            "tipo_contrato": "Indefinido",
            "fecha_ingreso": datetime(2017, 5, 1, tzinfo=UTC),
            "config_remuneracion": {
                "sueldo_base": 500000,
                "afp": "Capital",
                "salud": "Fonasa",
                "movilizacion": 30000,
                "colacion": 35000
            },
            "activo": True,
            "actualizado_en": datetime.now(UTC)
        }
    ]
    col_empleados.insert_many(empleados_data)
    print(f"   ✔ {len(empleados_data)} empleados creados.\n")

    # ── 4. Asistencia (último mes) ─────────────────────────────────────────────
    print("📅 Generando registros de Asistencia (Abril 2026)...")
    ruts_con_acceso = ["11111111-1", "22222222-2", "33333333-3", "44444444-4", "55555555-5"]
    dias_habiles = [1,2,3,6,7,8,9,10,13,14,15,16,17,20,21,22,23,24]
    estados_muestra = ["Presente"] * 16 + ["Atraso"] + ["Licencia"]

    asistencia_docs = []
    for rut in ruts_con_acceso:
        for i, dia in enumerate(dias_habiles):
            estado = estados_muestra[i % len(estados_muestra)]
            hora_entrada = "08:05" if estado == "Atraso" else "08:00"
            hora_salida  = "17:00" if estado != "Licencia" else None
            asistencia_docs.append({
                "empleado_rut": rut,
                "fecha": datetime(2026, 4, dia, tzinfo=UTC),
                "hora_entrada": hora_entrada,
                "hora_salida": hora_salida,
                "estado": estado,
                "horas_trabajadas": 9.0 if estado == "Presente" else (0 if estado == "Licencia" else 8.9),
                "comentario": "Licencia médica (art. 197 CdT)" if estado == "Licencia" else ""
            })
    col_asistencia.insert_many(asistencia_docs)
    print(f"   ✔ {len(asistencia_docs)} registros de asistencia creados.\n")

    # ── 5. Remuneraciones (Marzo 2026) ─────────────────────────────────────────
    print("💰 Generando Liquidaciones de Marzo 2026...")
    liquidaciones = []
    for emp in empleados_data[:5]:  # Solo los que tienen usuario
        sb = emp["config_remuneracion"]["sueldo_base"]
        movilizacion = emp["config_remuneracion"]["movilizacion"]
        colacion = emp["config_remuneracion"]["colacion"]
        gratificacion = round(sb * 0.25)       # Art. 50 Código del Trabajo
        horas_extra_monto = round(sb / 160 * 1.5 * 5)  # 5 hrs extra (Ley 21.561 - 40 hrs)
        total_imponible = sb + gratificacion + horas_extra_monto
        desc_afp = round(total_imponible * 0.115)       # ~11.5%
        desc_salud = round(total_imponible * 0.07)      # 7% legal
        desc_cesantia = round(total_imponible * 0.006)  # 0.6%
        total_haberes = total_imponible + movilizacion + colacion
        total_descuentos = desc_afp + desc_salud + desc_cesantia
        sueldo_liquido = total_haberes - total_descuentos

        liquidaciones.append({
            "empleado_rut": emp["rut"],
            "periodo": {"mes": 3, "anio": 2026},
            "haberes": {
                "imponibles": {
                    "sueldo_base": sb,
                    "gratificacion_legal": gratificacion,
                    "horas_extra": {"cantidad": 5, "monto": horas_extra_monto}
                },
                "no_imponibles": {"movilizacion": movilizacion, "colacion": colacion}
            },
            "descuentos_legales": {
                "afp": {"nombre": emp["config_remuneracion"]["afp"], "monto": desc_afp},
                "salud": {"nombre": emp["config_remuneracion"]["salud"], "monto": desc_salud},
                "seguro_cesantia": desc_cesantia
            },
            "totales": {
                "total_haberes": total_haberes,
                "total_descuentos": total_descuentos,
                "sueldo_liquido": sueldo_liquido
            },
            "estado_pago": "Pagado",
            "creado_en": datetime(2026, 3, 28, tzinfo=UTC)
        })
    col_remuneraciones.insert_many(liquidaciones)
    print(f"   ✔ {len(liquidaciones)} liquidaciones creadas.\n")

    # ── 6. Inventario ─────────────────────────────────────────────────────────
    print("📦 Creando Inventario de Talleres EMTP...")
    inventario_data = [
        # Taller Electromecánica
        {"codigo": "ELM-001", "nombre": "Taladro de Columna Industrial",       "categoria": "Electromecánica", "ubicacion": "Taller 1",       "cantidad": 3,  "stock_minimo": 1, "costo_unitario": 320000, "estado": "Disponible",    "ultimo_mantenimiento": datetime(2026, 2, 10, tzinfo=UTC)},
        {"codigo": "ELM-002", "nombre": "Multímetro Digital Fluke",             "categoria": "Electromecánica", "ubicacion": "Taller 1",       "cantidad": 10, "stock_minimo": 3, "costo_unitario": 45000,  "estado": "Disponible",    "ultimo_mantenimiento": datetime(2026, 1, 15, tzinfo=UTC)},
        {"codigo": "ELM-003", "nombre": "Soldador de Estaño 60W",               "categoria": "Electromecánica", "ubicacion": "Taller 1",       "cantidad": 8,  "stock_minimo": 2, "costo_unitario": 18000,  "estado": "Disponible",    "ultimo_mantenimiento": datetime(2026, 3, 5,  tzinfo=UTC)},
        {"codigo": "ELM-004", "nombre": "Motor Eléctrico Trifásico 1HP",        "categoria": "Electromecánica", "ubicacion": "Bodega Central", "cantidad": 2,  "stock_minimo": 1, "costo_unitario": 185000, "estado": "En Reparación", "ultimo_mantenimiento": datetime(2026, 4, 1,  tzinfo=UTC)},
        # Taller Informática
        {"codigo": "INF-001", "nombre": "Notebook HP ProBook 450 G9",           "categoria": "Informática",     "ubicacion": "Laboratorio 1",  "cantidad": 25, "stock_minimo": 5, "costo_unitario": 620000, "estado": "Disponible",    "ultimo_mantenimiento": datetime(2025, 12, 1, tzinfo=UTC)},
        {"codigo": "INF-002", "nombre": "Switch Cisco 24 Puertos",              "categoria": "Informática",     "ubicacion": "Sala Servidores","cantidad": 2,  "stock_minimo": 1, "costo_unitario": 280000, "estado": "Disponible",    "ultimo_mantenimiento": datetime(2026, 1, 20, tzinfo=UTC)},
        {"codigo": "INF-003", "nombre": "Cable UTP Cat6 (rollo 305m)",          "categoria": "Informática",     "ubicacion": "Bodega Central", "cantidad": 4,  "stock_minimo": 2, "costo_unitario": 42000,  "estado": "Disponible",    "ultimo_mantenimiento": None},
        # Insumos Generales
        {"codigo": "INS-001", "nombre": "Resma Papel A4 (500 hojas)",           "categoria": "Papelería",       "ubicacion": "Bodega Central", "cantidad": 40, "stock_minimo": 10,"costo_unitario": 4500,   "estado": "Disponible",    "ultimo_mantenimiento": None},
        {"codigo": "INS-002", "nombre": "Tóner Impresora HP LaserJet",          "categoria": "Papelería",       "ubicacion": "Bodega Central", "cantidad": 3,  "stock_minimo": 2, "costo_unitario": 38000,  "estado": "Crítico",       "ultimo_mantenimiento": None},
        {"codigo": "INS-003", "nombre": "Proyector Epson EB-E01",               "categoria": "Audiovisual",     "ubicacion": "Sala Profesores","cantidad": 5,  "stock_minimo": 2, "costo_unitario": 185000, "estado": "Disponible",    "ultimo_mantenimiento": datetime(2026, 2, 28, tzinfo=UTC)},
        {"codigo": "INS-004", "nombre": "Pizarra Blanca Magnética (120x90cm)",  "categoria": "Mobiliario",      "ubicacion": "Bodegas Salas",  "cantidad": 12, "stock_minimo": 2, "costo_unitario": 35000,  "estado": "Disponible",    "ultimo_mantenimiento": None},
    ]
    col_inventario.insert_many(inventario_data)
    print(f"   ✔ {len(inventario_data)} ítems de inventario creados.\n")

    # ── Resumen Final ──────────────────────────────────────────────────────────
    print("═"*55)
    print("  ✅  SEEDING COMPLETADO — Base de datos lista.")
    print("═"*55)
    print("\n📋 CREDENCIALES DE ACCESO PARA EL EQUIPO:")
    print("─"*60)
    print("  RUT          | CLAVE        | ROL / CARGO")
    print("─"*60)
    print("  11111111-1   | admin123     | Administrador General / Director")
    print("  22222222-2   | rrhh2026     | Encargado RRHH")
    print("  33333333-3   | remun2026    | Encargado Remuneraciones")
    print("  44444444-4   | bodega2026   | Encargado Bodega")
    print("─"*60)
    print("  * Nota: Los docentes no tienen usuario de acceso (MVP).")
    print("\n⚠️  RECUERDA: Comparte las claves solo por canal seguro.")
    print("    La Fase 5 encriptará estas contraseñas con bcrypt.\n")


if __name__ == "__main__":
    run_seed()
