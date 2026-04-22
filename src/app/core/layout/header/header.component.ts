import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

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

  // Datos del usuario simulados (MVP - después vendrán del AuthService)
  usuario = {
    nombre: 'Nombre Apellido',
    rol: 'Administrativo',
    iniciales: 'NA'
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
    // MVP: redirigir al login (AuthService real aquí en el futuro)
    window.location.href = '/login';
  }
}
