import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

export const latencyInterceptor: HttpInterceptorFn = (req, next) => {
  // Configuración de la latencia simulada (min 2.5s, max 5.0s)
  // Esto refleja el tiempo de viaje de ida y vuelta a un servidor real en la nube,
  // permitiendo que el profesor evalúe las Heurísticas de Nielsen (loaders, shimmers).
  const minDelay = 2500;
  const maxDelay = 5000;
  const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

  const toastService = inject(ToastService);

  return next(req).pipe(
    delay(randomDelay),
    tap(event => {
      // Fase 2 - Intercepción de Mutaciones Exitosas
      if (event instanceof HttpResponse) {
        // Solo reaccionar a POST, PUT, DELETE (ignorar GET para no hacer spam)
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
          const body = event.body as any;
          console.log('[Interceptor] Interceptado:', req.method, req.url);
          console.log('[Interceptor] Body extraído:', body);
          
          if (body && (body.success === true || event.status === 200 || event.status === 201)) {
            const successMsg = body?.message ? String(body.message) : 'Operación realizada correctamente.';
            console.log('[Interceptor] Mensaje a mostrar:', successMsg);
            toastService.show(successMsg, 'success');
          }
        }
      }
    }),
    catchError(error => {
      // Fase 1 - Intercepción Global de Errores
      const errorMsg = error?.error?.message || error?.error?.error || 'Error de conexión con el servidor.';
      toastService.show(errorMsg, 'error');
      
      console.warn(`[Interceptor] Petición fallida hacia ${req.url}`, error);
      return throwError(() => error);
    })
  );
};
