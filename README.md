# ERP EMTP — Sistema de Gestión Centralizado

![Estado del Proyecto](https://img.shields.io/badge/Estado-Mockup_Navegable_(EPE2)-blue?style=for-the-badge)
![Angular](https://img.shields.io/badge/Angular_21-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

## Descripción del Proyecto

**ERP EMTP** es una solución integral de planificación de recursos diseñada específicamente para Liceos Técnicos Profesionales (EMTP) en Chile. El sistema centraliza la gestión administrativa, docente y de inventario, resolviendo la fragmentación de datos y optimizando los procesos operativos de la institución.

Este proyecto forma parte de la evaluación **EPE2**, enfocándose en la creación de un mockup navegable de alta fidelidad con una experiencia de usuario (UX) madura y profesional.

---

## Características Principales

### Login Aurora (Experiencia de Usuario Premium)
- **Diseño Estético y Minimalista**: Inspirado en la sobriedad y elegancia corporativa.
- **Atmósfera Dinámica**: Fondo de aurora boreal en un cielo nocturno con montañas y animaciones sutiles.
- **Glassmorphism**: Interfaz de tarjeta flotante con textura mate y efectos de profundidad.
- **Feedback Interactivo**: Iluminación dinámica (Glow) según el foco del usuario y estados de carga progresivos.

### Módulos Integrados (MVP)
1.  **Dashboard Central**: Panel de control adaptativo con métricas y actividades filtradas dinámicamente según el rol.
2.  **Mi Perfil**: Gestión segura de credenciales, cambio de contraseñas cruzado con base de datos y visualización de datos de empleado.
3.  **Recursos Humanos (RRHH)**: Gestión de personal, mantenedor de funcionarios y visualización de asistencia.
4.  **Remuneraciones**: Liquidación de sueldos, cálculo de bonos, descuentos y generación de documentos.
5.  **Inventario**: Control de stock crítico, trazabilidad de insumos y sistema de alertas.

---

## Filosofía de Diseño y Usabilidad

El sistema ha sido auditado bajo las **10 Heurísticas de Jakob Nielsen**, priorizando:
- **Visibilidad del estado del sistema**: Feedback inmediato en cada acción del usuario.
- **Consistencia y estándares**: Sistema de diseño unificado en todos los módulos operativos.
- **Prevención de errores**: Validaciones visuales y mensajes claros con soluciones sugeridas.
- **Diseño estético y funcional**: Eliminación de ruidos visuales para centrarse en la eficiencia del dato.

---

## Stack Tecnológico

**Frontend (Interfaz de Usuario)**
- **Framework**: Angular 21
- **Estilos**: CSS3 (Vanilla) con Sistema de Design Tokens dinámicos (Dark/Light Mode)
- **Iconografía**: SVG Inline / Lucide Icons
- **Tipografía**: Inter (Google Fonts) para máxima legibilidad

**Backend & Base de Datos**
- **Framework**: Django (Python) para la lógica de API Rest.
- **Base de Datos**: MongoDB Atlas (NoSQL) centralizado.
- **Seguridad**: JWT (JSON Web Tokens) y encriptación con Bcrypt.

---

## Seguridad y Arquitectura (Nivel Enterprise)

El sistema ha superado la fase de mockup estático, implementando una arquitectura de seguridad real:
- **Autenticación Robusta**: Tokens JWT (JSON Web Tokens) inyectados vía Interceptors en Angular.
- **Protección de Datos (Backend)**: Contraseñas hasheadas en base de datos mediante `bcrypt` con Salt dinámico.
- **Control de Acceso por Roles (RBAC)**: Enrutamiento bloqueado mediante `Guards` de Angular. Cada módulo (RRHH, Inventario, Remuneraciones) es inaccesible si el token del usuario no contiene el rol específico requerido.
- **Separación de Lógica de Negocio**: Diferenciación a nivel de base de datos entre credenciales de acceso (Colección `usuarios`) e información personal (Colección `empleados`), respetando el paradigma clásico de los sistemas ERP.

---

## Equipo de Desarrollo
*Desarrollado para la cátedra de Desarrollo de Sistemas ERP.*

---

**Versión**: 1.0.0 — Abril 2026
