import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RrhhService {
  // URL de tu backend en Django
  private apiUrl = 'http://127.0.0.1:8000/api/empleados';

  constructor(private http: HttpClient) { }

  obtenerEmpleados(soloActivos: boolean = false): Observable<any> {
    let params = new HttpParams();
    
    if (soloActivos) {
      params = params.set('activo', 'true');
    }
    
    return this.http.get<any>(this.apiUrl, { params });
  }
}