import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://127.0.0.1:8000/api/inventario/';

  getInventario(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  getArticulosCriticos(): Observable<any> {
    return this.http.get(`${this.apiUrl}criticos/`);
  }

  crearArticulo(articulo: any): Observable<any> {
    return this.http.post(this.apiUrl, articulo);
  }

  actualizarArticulo(codigo: string, datos: any): Observable<any> {
    return this.http.put(`${this.apiUrl}${codigo}/`, datos);
  }

  eliminarArticulo(codigo: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}${codigo}/`);
  }
}
