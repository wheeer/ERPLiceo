from .auth import status_check, login_view, cambiar_clave_view
from .remuneraciones import (
    calcular_remuneraciones,
    obtener_pdf_liquidacion,
    obtener_liquidacion_empleado,
    obtener_remuneraciones,
    obtener_horas_extra,
    procesar_pagos_lote,
    declarar_impagos_lote
)
from .inventario import (
    inventario_lista,
    inventario_detalle,
    inventario_criticos,
    inventario_poco_stock
)
from .rrhh import (
    lista_empleados, 
    obtener_asistencia_mensual,
    api_empleados,
    api_empleado_detalle,
    api_asistencia,
    api_asistencia_resumen,
    api_horas_extra
)
from .dashboard import (
    api_dashboard_resumen, 
    api_dashboard_actividades
)
from .notificaciones import (
    api_notificaciones,
    api_notificacion_estado
)
