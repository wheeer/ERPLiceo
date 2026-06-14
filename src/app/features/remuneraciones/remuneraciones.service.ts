import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RemuneracionesService {
  private apiUrl = `${environment.apiUrl}/remuneraciones/`;
  private horasExtraUrl = `${environment.apiUrl}/horas-extra/`;

  constructor(private http: HttpClient) {}

  obtenerRemuneraciones(mes: number, anio: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}${mes}/${anio}/`);
  }

  obtenerHorasExtra(mes: number, anio: number): Observable<any> {
    return this.http.get<any>(`${this.horasExtraUrl}${mes}/${anio}/`);
  }

  registrarHorasExtra(payload: any): Observable<any> {
    return this.http.post<any>(this.horasExtraUrl, payload);
  }

  calcularRemuneraciones(mes: number, anio: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}calcular/`, { mes, anio });
  }

  pagarLote(pagados: string[], impagos: string[]): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}lote/pagar/`, { pagados, impagos });
  }

  marcarImpagoLote(impagos: string[], motivo: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}lote/impago/`, { impagos, motivo });
  }
}
