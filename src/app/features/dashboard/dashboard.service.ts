import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface DashboardMetrics {
  empleados_activos: number;
  articulos_criticos: number;
  ausencias_mes: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api/dashboard/resumen/';
  private activitiesUrl = 'http://127.0.0.1:8000/api/dashboard/actividades/';

  getMetrics(): Observable<DashboardMetrics> {
    // delay(800) simula carga artificial para mantener feedback visual
    return this.http.get<DashboardMetrics>(this.apiUrl).pipe(delay(800));
  }

  getActivities(): Observable<any> {
    return this.http.get<any>(this.activitiesUrl);
  }
}
