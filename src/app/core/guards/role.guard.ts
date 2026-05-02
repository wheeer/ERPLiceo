import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Obtener los roles permitidos desde la configuración de la ruta (app.routes.ts)
  const allowedRoles = route.data?.['roles'] as string[];
  const userRole = authService.getUserRole();

  if (!userRole) {
    // Si ni siquiera hay rol, lo mandamos al login (aunque authGuard debería atraparlo primero)
    return router.createUrlTree(['/login']);
  }

  // El Administrador General siempre tiene acceso a todo en este MVP
  if (userRole === 'Administrador_General') {
    return true;
  }

  // Verificar si el rol del usuario está en la lista de permitidos
  if (allowedRoles && allowedRoles.includes(userRole)) {
    return true;
  }

  // Si no tiene permiso, redirigir silenciosamente al dashboard (como definimos en la arquitectura)
  return router.createUrlTree(['/app/dashboard']);
};
