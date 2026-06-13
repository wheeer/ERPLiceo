import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RrhhService {
  private apiUrl = `${environment.apiUrl}/empleados/`;
  private asistenciaUrl = `${environment.apiUrl}/asistencia/`;
  private horasExtraUrl = `${environment.apiUrl}/horas-extra/`;

  constructor(private http: HttpClient) { }

  obtenerEmpleados(soloActivos: boolean = false): Observable<any> {
    let params = new HttpParams();
    
    if (soloActivos) {
      params = params.set('activo', 'true');
    }
    
    return this.http.get<any>(this.apiUrl, { params });
  }

  obtenerAsistencia(mes: number, anio: number, rut?: string): Observable<any> {
    let url = `${this.asistenciaUrl}${mes}/${anio}/`;
    let params = new HttpParams();
    
    if (rut) {
      params = params.set('rut', rut);
    }
    
    return this.http.get<any>(url, { params });
  }

  registrarAsistenciaDiaria(registros: any[]): Observable<any> {
    return this.http.post<any>(this.asistenciaUrl, registros);
  }

  verificarEstadoDia(): Observable<any> {
    return this.http.get<any>(`${this.asistenciaUrl}estado-hoy/`);
  }

  sellarAsistenciaDia(): Observable<any> {
    return this.http.post<any>(`${this.asistenciaUrl}sellar/`, {});
  }

  registrarHorasExtra(registro: any): Observable<any> {
    return this.http.post<any>(this.horasExtraUrl, registro);
  }

  obtenerHorasExtra(mes: number, anio: number): Observable<any> {
    return this.http.get<any>(`${this.horasExtraUrl}${mes}/${anio}/`);
  }

  crearEmpleado(empleadoData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, empleadoData);
  }

  actualizarEmpleado(rut: string, empleadoData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}${rut}/`, empleadoData);
  }

  darDeBajaEmpleado(rut: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}${rut}/`);
  }

  swapTurno(rut: string, fechaLibre: string, fechaTrabaja: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}${rut}/swap/`, {
      fecha_libre: fechaLibre,
      fecha_trabaja: fechaTrabaja
    });
  }
}
