import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Signal para manejar el estado de autenticación de forma reactiva
  private isAuthenticatedSignal = signal<boolean>(this.hasToken());

  constructor(private router: Router) {}

  // Getter público del estado
  get isAuthenticated() {
    return this.isAuthenticatedSignal();
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('erp_token');
  }

  login(rut: string) {
    // Simulamos la generación de un token real
    const mockToken = `session_${btoa(rut)}_${Date.now()}`;
    localStorage.setItem('erp_token', mockToken);
    localStorage.setItem('user_name', 'Usuario Demo'); // Para el Header
    this.isAuthenticatedSignal.set(true);
  }

  logout() {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('user_name');
    this.isAuthenticatedSignal.set(false);
    this.router.navigate(['/login']);
  }
}
