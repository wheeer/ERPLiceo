import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkActive, RouterLink } from '@angular/router';

interface NavItem {
  id: string;
  label: string;
  ruta: string;
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
      ruta: '/app/rrhh'
    },
    {
      id: 'remuneraciones',
      label: 'Remuneraciones',
      ruta: '/app/remuneraciones'
    },
    {
      id: 'inventario',
      label: 'Inventario',
      ruta: '/app/inventario'
    }
  ];
}
