import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RrhhService {
  // URL de tu backend en Django
  private apiUrl = 'http://127.0.0.1:8000/api/empleados/';
  private asistenciaUrl = 'http://127.0.0.1:8000/api/asistencia/';

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
<<<<<<< HEAD
=======

  crearEmpleado(empleadoData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, empleadoData);
  }

  actualizarEmpleado(rut: string, empleadoData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}${rut}/`, empleadoData);
  }

  darDeBajaEmpleado(rut: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}${rut}/`);
  }
>>>>>>> origin/main
}