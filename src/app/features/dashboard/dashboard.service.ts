import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
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
  private apiUrl = `${environment.apiUrl}/dashboard/resumen/`;
  private activitiesUrl = `${environment.apiUrl}/dashboard/actividades/`;

  getMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(this.apiUrl);
  }

  getActivities(): Observable<any> {
    return this.http.get<any>(this.activitiesUrl);
  }

  getChartRRHH(query: string): Observable<any> {
    // query ya viene con el formato '?tipo=diario&fecha=...'
    return this.http.get<any>(`${environment.apiUrl}/asistencia/resumen/${query}`);
  }

  getChartRemuneraciones(query: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/remuneraciones/${query}`);
  }

  getChartInventario(categoria: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/inventario/`);
  }
}
