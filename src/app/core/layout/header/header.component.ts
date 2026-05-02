import { Component, EventEmitter, Output, inject, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
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
  private elementRef = inject(ElementRef);

  pageTitle = 'Dashboard Principal';
  private routerSub!: Subscription;

  // Datos del usuario cargados desde el AuthService
  usuario = {
    nombre: localStorage.getItem('user_display_name') || 'Usuario',
    cargo: localStorage.getItem('user_cargo') || 'Sin cargo',
    iniciales: this.calcularIniciales(localStorage.getItem('user_display_name') || 'U')
  };

  private calcularIniciales(nombre: string): string {
    const partes = nombre.trim().split(' ');
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
  }

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

  irAPerfil() {
    this.mostrarMenuUsuario = false;
    this.router.navigate(['/app/perfil']);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.mostrarNotificaciones = false;
      this.mostrarMenuUsuario = false;
    }
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
