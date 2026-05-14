import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ArticuloInventario {
  codigo: string;
  nombre: string;
  categoria: string;
  ubicacion: string;
  cantidad: number;
  stock_minimo: number;
  costo_unitario: number;
  estado: string;
  ultimo_mantenimiento: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private http = inject(HttpClient);
  // URL base apuntando a nuestro backend Django
  private readonly apiUrl = 'http://127.0.0.1:8000/api/inventario';

  constructor() {}

  getInventario(): Observable<ApiResponse<ArticuloInventario[]>> {
    return this.http.get<ApiResponse<ArticuloInventario[]>>(`${this.apiUrl}/`);
  }
}
