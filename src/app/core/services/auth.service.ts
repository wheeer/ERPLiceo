import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSignal = signal<boolean>(this.hasToken());

  private http = inject(HttpClient);
  private readonly apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private router: Router) {}

  get isAuthenticated() {
    return this.isAuthenticatedSignal();
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('erp_token');
  }

  getUserRole(): string | null {
    return localStorage.getItem('user_role');
  }

  getUserName(): string | null {
    return localStorage.getItem('user_display_name');
  }

  getUserCargo(): string | null {
    return localStorage.getItem('user_cargo');
  }

  login(rut: string, password: string): Observable<any> {
    const payload = { rut, password };

    return this.http.post(`${this.apiUrl}/login/`, payload).pipe(
      tap((respuesta: any) => {
        const u = respuesta.usuario;
        localStorage.setItem('erp_token', respuesta.token);
        localStorage.setItem('user_rut', u.rut);
        localStorage.setItem('user_display_name', u.nombre_completo);
        localStorage.setItem('user_cargo', u.cargo);
        localStorage.setItem('user_role', u.rol_nombre);
        localStorage.setItem('user_fecha_ingreso', u.fecha_ingreso);
        localStorage.setItem('user_tipo_contrato', u.tipo_contrato);
        localStorage.setItem('user_ultimo_acceso', u.ultimo_acceso);
        this.isAuthenticatedSignal.set(true);
      })
    );
  }

  cambiarClave(claveActual: string, nuevaClave: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cambiar-clave/`, {
      clave_actual: claveActual,
      nueva_clave: nuevaClave
    });
  }

  logout() {
    localStorage.clear();
    this.isAuthenticatedSignal.set(false);
    this.router.navigate(['/login']);
  }
}
