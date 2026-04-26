import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkActive, RouterLink } from '@angular/router';

interface NavSubItem {
  label: string;
  tab: string;
}

interface NavItem {
  id: string;
  label: string;
  ruta: string;
  subItems?: NavSubItem[];
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

  // Estado del menú desplegable
  expandedModuleId: string | null = null;

  // Navegación dinámica (basada en PROPUESTA_EPE1 - Módulos MVP)
  navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      ruta: '/app/dashboard'
    },
    {
      id: 'rrhh',
      label: 'Recursos Humanos',
      ruta: '/app/rrhh',
      subItems: [
        { label: 'Vista General', tab: 'general' },
        { label: 'Gestión de Personal', tab: 'gestion' }
      ]
    },
    {
      id: 'remuneraciones',
      label: 'Remuneraciones',
      ruta: '/app/remuneraciones',
      subItems: [
        { label: 'Resumen de Nómina', tab: 'nomina' },
        { label: 'Horas Extra', tab: 'horasExtra' }
      ]
    },
    {
      id: 'inventario',
      label: 'Inventario',
      ruta: '/app/inventario',
      subItems: [
        { label: 'Vista de Stock', tab: 'stock' },
        { label: 'Gestión de Insumos', tab: 'gestion' }
      ]
    }
  ];

  toggleModule(id: string, event: Event) {
    if (this.isCollapsed) return; // En modo colapsado, el clic navega directamente
    
    // Si hace clic en el mismo, lo cierra. Si hace clic en otro, lo abre.
    this.expandedModuleId = this.expandedModuleId === id ? null : id;
  }
}
