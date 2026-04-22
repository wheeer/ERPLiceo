import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // Lógica mockeada temporalmente para el MVP.
  // Más adelante verificaremos un token JWT real.
  const isAuthenticated = true; // Cambiar a false para probar el rechazo

  if (isAuthenticated) {
    return true;
  } else {
    // Si no está autenticado, lo devolvemos al login de inmediato
    return router.createUrlTree(['/login']);
  }
};
