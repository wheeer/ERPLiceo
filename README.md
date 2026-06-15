# ERP EMTP — Sistema de Gestión Centralizado

![Estado del Proyecto](https://img.shields.io/badge/Estado-MVP-brightgreen?style=for-the-badge)
![Angular](https://img.shields.io/badge/Angular_21-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

## Visión del Proyecto

**ERP EMTP** es una solución de planificación de recursos diseñada específicamente para **Liceos Técnicos Profesionales (EMTP)** en Chile. El sistema centraliza la gestión administrativa, docente e institucional, resolviendo la fragmentación de datos y optimizando los procesos operativos mediante una plataforma única e integrada.

---

## Experiencia de Usuario: Login Aurora

El sistema mantiene su característica **Experiencia de Usuario Premium** en el acceso principal:
- **Atmósfera Dinámica**: Fondo de aurora boreal con animaciones sutiles para una bienvenida profesional.
- **Glassmorphism**: Interfaz de tarjeta flotante con efectos de profundidad y textura mate.
- **Feedback Interactivo**: Sistema de iluminación dinámica (Glow) y estados de carga progresivos.
- **Alertas en Tiempo Real**: Notificaciones dinámicas instantáneas impulsadas por WebSockets para no bloquear la experiencia del usuario.

---

## Arquitectura de Módulos: Pantalla Completa

Para garantizar la máxima eficiencia operativa y resolver problemas de visualización en monitores de alta resolución, los módulos principales han evolucionado:
- **Adiós a los Modales**: Transición de diálogos restrictivos a una **Arquitectura de Pantalla Completa**, permitiendo una gestión de datos más robusta y clara.
- **Flujos Continuos**: Navegación fluida entre el listado de registros y los formularios de edición/creación con alta densidad de datos.
- **Diseño Adaptativo**: Optimización del espacio de trabajo para tareas complejas en los módulos de RRHH, Remuneraciones e Inventario.

---

## Módulos Implementados (MVP)

1.  **Autenticación y Perfil**: Control de sesión mediante JWT y gestión de la cuenta del usuario activo.
2.  **Recursos Humanos (RRHH)**: Gestión de funcionarios, mantenedores de personal y sistema visual de asistencia.
3.  **Remuneraciones**: Automatización de cálculos basada en asistencia, gestión de bonos y generación de liquidaciones en PDF.
4.  **Inventario**: Control de stock con alertas de estado crítico y trazabilidad total de insumos.
5.  **Dashboard de Gestión**: Panel con métricas clave para la toma de decisiones por parte de Directivos y Administrativos.

---

## Filosofía de Diseño y Usabilidad

El diseño se rige por las heurísticas de Jakob Nielsen, priorizando:
- **Visibilidad del estado**: Feedback inmediato en cada transacción.
- **Consistencia y estándares**: Una gramática visual coherente entre todos los módulos.
- **Prevención de errores**: Validaciones en tiempo real en formularios de pantalla completa.
- **Eficiencia de uso**: Acceso rápido a las funciones críticas de cada rol (Administrativo, Directivo, Docente).

---

## Stack Tecnológico

- **Frontend**: Angular 21 (Standalone) con CSS3 Vanilla (Design Tokens dinámicos).
- **Backend**: Django REST Framework (Python) para una lógica de negocio segura y escalable.
- **Tiempo Real**: Django Channels (WebSockets) para el motor de notificaciones en tiempo real.
- **Base de Datos**: MongoDB operada directamente mediante `PyMongo` (Sin ORM) para una gestión de datos flexible.
- **Seguridad**: Seguridad mediante Autenticación JWT y protección de rutas Frontend con Guards de Angular (`role.guard.ts`).

---

## Equipo de Desarrollo
*Desarrollado para la cátedra de Desarrollo de Sistemas ERP.*

---

**Versión**: 1.2.1 — Mayo 2026
