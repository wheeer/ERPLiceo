import { Component, EventEmitter, Output, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap, Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Output() toggleSidebarEvent = new EventEmitter<void>();

  themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  pageTitle = 'Dashboard Principal';
  private routerSub!: Subscription;

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

  ngOnInit() {
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map(route => {
        while (route.firstChild) route = route.firstChild;
        return route;
      }),
      filter(route => route.outlet === 'primary'),
      mergeMap(route => route.data)
    ).subscribe(data => {
      this.pageTitle = data['title'] || 'ERP EMTP';
    });
  }

  ngOnDestroy() {
    if (this.routerSub) this.routerSub.unsubscribe();
  }
}
