import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isAuthenticated) {
    return true;
  } else {
    // Si no hay sesión real, bloqueamos el acceso (Corrección #7 de auditoría)
    return router.createUrlTree(['/login']);
  }
};
