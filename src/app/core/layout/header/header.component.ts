import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @Output() toggleSidebarEvent = new EventEmitter<void>();

  themeService = inject(ThemeService);
  private authService = inject(AuthService);

  // Datos del usuario (Cargados desde localStorage o AuthService)
  usuario = {
    nombre: localStorage.getItem('user_name') || 'Usuario Demo',
    rol: 'Administrativo',
    iniciales: 'UD'
  };

  notificaciones = [
    { texto: 'Inventario: 3 ítems bajo stock mínimo', leida: false },
    { texto: 'Nómina de Abril pendiente de aprobación', leida: false },
    { texto: 'Nuevo docente registrado en RRHH', leida: true }
  ];

  mostrarNotificaciones = false;
  mostrarMenuUsuario = false;

  get notificacionesSinLeer(): number {
    return this.notificaciones.filter(n => !n.leida).length;
  }

  toggleNotificaciones() {
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
    this.mostrarMenuUsuario = false;
  }

  toggleMenuUsuario() {
    this.mostrarMenuUsuario = !this.mostrarMenuUsuario;
    this.mostrarNotificaciones = false;
  }

  cerrarSesion() {
    this.authService.logout();
  }
}
