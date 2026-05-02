import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Obtenemos el token guardado en la sesión
  const token = localStorage.getItem('erp_token');

  // Si el usuario tiene un Token JWT válido, clonamos la petición HTTP
  // y le pegamos el token en la cabecera 'Authorization'.
  // Esto es como mostrar la credencial al guardia en cada puerta que cruzas.
  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest);
  }

  // Si no hay token (ej. está haciendo Login), la petición pasa tal cual
  return next(req);
};
