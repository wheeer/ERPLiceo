import { Component, EventEmitter, Output, inject, OnInit, OnDestroy, HostListener, ElementRef, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap, Subscription } from 'rxjs';
import { NotificationService, AppNotification } from '../../services/notification.service';

export interface NotificationFilter {
  id: string;
  label: string;
  class: string;
  priorityValue: number;
  roles?: string[]; // Si no se define, lo ven todos.
}

export const NOTIFICATION_FILTERS: NotificationFilter[] = [
  { id: 'Todas', label: 'Todas', class: '', priorityValue: 0 },
  { id: 'Stock Crítico', label: 'Crítico', class: 'priority-stock', priorityValue: 1, roles: ['Administrador_General', 'Encargado_Bodega'] },
  { id: 'Poco Stock', label: 'Poco Stock', class: 'priority-poco-stock', priorityValue: 2, roles: ['Administrador_General', 'Encargado_Bodega'] },
  { id: 'Urgente', label: 'Urgente', class: 'priority-urgente', priorityValue: 3 },
  { id: 'Éxito', label: 'Éxito', class: 'priority-exito', priorityValue: 4 },
  { id: 'Informativa', label: 'Info', class: 'priority-info', priorityValue: 5 }
];

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
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

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
  private notificationService = inject(NotificationService);
  userRole: string | null = null;
  notificaciones: AppNotification[] = [];
  private notifSub!: Subscription;

  // Variables para la vista
  notificationFilters = NOTIFICATION_FILTERS;
  filtroPrioridad: string = 'Todas';
  mostrarNotificaciones = false;
  mostrarMenuUsuario = false;

  get visibleNotificationFilters(): NotificationFilter[] {
    return this.notificationFilters.filter(f => 
      !f.roles || f.roles.includes(this.userRole || '')
    );
  }

  get notificacionesSinLeer(): number {
    return this.notificaciones.filter(n => !n.leida).length;
  }

  marcarComoLeida(notificacion: AppNotification) {
    notificacion.leida = true;
    
    // Si la notificación tiene ID de base de datos, despachamos al servidor
    if (notificacion._id) {
      this.notificationService.markAsRead(notificacion._id).subscribe({
        next: () => console.log('✅ Notificación marcada como leída en DB'),
        error: (err) => console.error('❌ Error al marcar notificación:', err)
      });
    }

    if (notificacion.url_destino && notificacion.url_destino !== '#') {
      this.router.navigateByUrl(notificacion.url_destino);
      this.mostrarNotificaciones = false;
    }
  }

  toggleNotificaciones() {
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
    this.mostrarMenuUsuario = false;
  }

  toggleMenuUsuario() {
    this.mostrarMenuUsuario = !this.mostrarMenuUsuario;
    this.mostrarNotificaciones = false;
  }

  setFiltroPrioridad(filtro: string) {
    this.filtroPrioridad = filtro;
  }

  get notificacionesFiltradasYOrdenadas(): AppNotification[] {
    let filtradas = this.notificaciones;
    if (this.filtroPrioridad !== 'Todas') {
      filtradas = filtradas.filter(n => (n.tipo || 'Informativa') === this.filtroPrioridad);
    }
    
    // Mapeo dinámico de prioridades basado en NOTIFICATION_FILTERS
    const prioridadMap = new Map<string, number>();
    NOTIFICATION_FILTERS.forEach(f => prioridadMap.set(f.id, f.priorityValue));
    
    return filtradas.sort((a, b) => {
      const pA = prioridadMap.get(a.tipo || 'Informativa') || 99;
      const pB = prioridadMap.get(b.tipo || 'Informativa') || 99;
      if (pA !== pB) return pA - pB;
      
      const dA = new Date(a.fecha_creacion || 0).getTime();
      const dB = new Date(b.fecha_creacion || 0).getTime();
      return dB - dA; // Más recientes primero
    });
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
      this.cdr.detectChanges();
    });

    this.userRole = this.authService.getUserRole();

    // Función global auxiliar para probar notificaciones fácilmente desde la consola
    (window as any).sendTestNotif = () => {
      this.notificationService.sendMessage({
        mensaje: '⚠️ Alerta de Stock Crítico en Bodega Central (Prueba)',
        modulo: 'inventario',
        url_destino: '/app/inventario'
      });
      console.log('✅ Comando de prueba enviado al servidor.');
    };

    // Suscripción al WebSocket de notificaciones en tiempo real
    this.notifSub = this.notificationService.getNotifications().subscribe({
      next: (msg: AppNotification) => {
        console.log('🔔 Notificación recibida por WebSocket:', msg);
        
        // Filtrado dinámico por roles
        let mostrar = false;
        const mod = msg.modulo;

        if (this.userRole === 'Administrador_General') mostrar = true;
        else if (this.userRole === 'Encargado_RRHH' && (mod === 'rrhh' || mod === 'general')) mostrar = true;
        else if (this.userRole === 'Encargado_Remuneraciones' && (mod === 'remuneraciones' || mod === 'general')) mostrar = true;
        else if (this.userRole === 'Encargado_Bodega' && (mod === 'inventario' || mod === 'general')) mostrar = true;

        if (mostrar) {
          this.ngZone.run(() => {
            // Agregar al principio de la lista y forzar nueva referencia
            this.notificaciones = [{ ...msg, leida: false }, ...this.notificaciones];
            this.cdr.detectChanges();
            console.log('✅ Notificación aprobada y agregada para el rol:', this.userRole);
          });
        } else {
          console.log('❌ Notificación ignorada (no tienes permisos para este módulo). Rol:', this.userRole, 'Módulo:', mod);
        }
      },
      error: (err) => console.error('🔴 Error en WebSocket:', err)
    });

    // Cargar el historial persistente desde el Backend
    this.notificationService.getHistoricalNotifications().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Filtrar por roles también las históricas si el backend no lo hizo estrictamente
          const historicas = response.data.filter((msg: AppNotification) => {
            const mod = msg.modulo;
            if (this.userRole === 'Administrador_General') return true;
            if (this.userRole === 'Encargado_RRHH' && (mod === 'rrhh' || mod === 'general')) return true;
            if (this.userRole === 'Encargado_Remuneraciones' && (mod === 'remuneraciones' || mod === 'general')) return true;
            if (this.userRole === 'Encargado_Bodega' && (mod === 'inventario' || mod === 'general')) return true;
            return false;
          });

          this.ngZone.run(() => {
            // Unimos el historial con las notificaciones que hayan llegado por WS recién conectarnos
            this.notificaciones = [...this.notificaciones, ...historicas];
          });
        }
      },
      error: (err) => console.error('🔴 Error al cargar historial de notificaciones:', err)
    });

  }


  ngOnDestroy() {
    if (this.routerSub) this.routerSub.unsubscribe();
    if (this.notifSub) this.notifSub.unsubscribe();
  }
}
