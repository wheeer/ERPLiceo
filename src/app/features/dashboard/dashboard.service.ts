import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  private apiUrl = 'https://erpliceo.ddns.net/api/dashboard/resumen/';
  private activitiesUrl = 'https://erpliceo.ddns.net/api/dashboard/actividades/';

  getMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(this.apiUrl);
  }

  getActivities(): Observable<any> {
    return this.http.get<any>(this.activitiesUrl);
  }

  getChartRRHH(query: string): Observable<any> {
    // query ya viene con el formato '?tipo=diario&fecha=...'
    return this.http.get<any>(`https://erpliceo.ddns.net/api/asistencia/resumen/${query}`);
  }

  getChartRemuneraciones(query: string): Observable<any> {
    return this.http.get<any>(`https://erpliceo.ddns.net/api/remuneraciones/${query}`);
  }

  getChartInventario(categoria: string): Observable<any> {
    return this.http.get<any>(`https://erpliceo.ddns.net/api/inventario/`);
  }
}
