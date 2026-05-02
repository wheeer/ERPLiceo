import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkActive, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface NavSubItem {
  label: string;
  tab: string;
}

interface NavItem {
  id: string;
  label: string;
  ruta: string;
  subItems?: NavSubItem[];
  roles?: string[]; // Si no tiene roles, todos lo ven (ej: dashboard)
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLinkActive, RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() isCollapsed = false;
  private authService = inject(AuthService);

  // Estado del menú desplegable
  expandedModuleId: string | null = null;

  // Navegación dinámica (basada en PROPUESTA_EPE1 - Módulos MVP)
  private allNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      ruta: '/app/dashboard'
    },
    {
      id: 'rrhh',
      label: 'Recursos Humanos',
      ruta: '/app/rrhh',
      roles: ['Encargado_RRHH'],
      subItems: [
        { label: 'Vista General', tab: 'general' },
        { label: 'Gestión de Personal', tab: 'gestion' }
      ]
    },
    {
      id: 'remuneraciones',
      label: 'Remuneraciones',
      ruta: '/app/remuneraciones',
      roles: ['Encargado_Remuneraciones'],
      subItems: [
        { label: 'Resumen de Nómina', tab: 'nomina' },
        { label: 'Horas Extra', tab: 'horasExtra' }
      ]
    },
    {
      id: 'inventario',
      label: 'Inventario',
      ruta: '/app/inventario',
      roles: ['Encargado_Bodega'],
      subItems: [
        { label: 'Vista de Stock', tab: 'stock' },
        { label: 'Gestión de Insumos', tab: 'gestion' }
      ]
    }
  ];

  // Filtra los items visibles según el rol del usuario autenticado
  get navItems(): NavItem[] {
    const userRole = this.authService.getUserRole();
    if (userRole === 'Administrador_General') {
      return this.allNavItems;
    }
    return this.allNavItems.filter(item => !item.roles || item.roles.includes(userRole || ''));
  }

  toggleModule(id: string, event: Event) {
    if (this.isCollapsed) return; // En modo colapsado, el clic navega directamente
    
    // Si hace clic en el mismo, lo cierra. Si hace clic en otro, lo abre.
    this.expandedModuleId = this.expandedModuleId === id ? null : id;
  }
}
