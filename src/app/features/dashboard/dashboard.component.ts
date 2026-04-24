import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ActivityLog {
  id: number;
  type: 'create' | 'update' | 'delete' | 'login' | 'export';
  action: string;
  description: string;
  module: 'rrhh' | 'remuneraciones' | 'inventario' | 'auth';
  user: string;
  timestamp: Date;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  
  // Métricas MVP (Propuesta de valor)
  metrics = [
    { title: 'Personal Activo', value: '142', icon: 'users', color: 'blue', subtext: '+3 altas este mes' },
    { title: 'Stock Crítico', value: '8', icon: 'alert', color: 'red', subtext: 'Insumos requieren atención' },
    { title: 'Nómina Pendiente', value: '1', icon: 'file', color: 'emerald', subtext: 'Mes de Abril' },
    { title: 'Alertas Sistema', value: '3', icon: 'bell', color: 'purple', subtext: 'Sin leer' }
  ];

  // Mock: Actividades recientes del sistema
  activities: ActivityLog[] = [
    {
      id: 1,
      type: 'login',
      action: 'Inicio de Sesión',
      description: 'Admin accedió al sistema',
      module: 'auth',
      user: 'Administrador',
      timestamp: new Date(Date.now() - 5 * 60000) // Hace 5 min
    },
    {
      id: 2,
      type: 'create',
      action: 'Empleado Registrado',
      description: 'Se agregó nuevo empleado: Juan Pérez (RUT: 12345678-9)',
      module: 'rrhh',
      user: 'María González',
      timestamp: new Date(Date.now() - 25 * 60000) // Hace 25 min
    },
    {
      id: 3,
      type: 'update',
      action: 'Nómina Actualizada',
      description: 'Actualización de escala salarial para 15 empleados',
      module: 'remuneraciones',
      user: 'Contador Principal',
      timestamp: new Date(Date.now() - 1.5 * 3600000) // Hace 1.5 horas
    },
    {
      id: 4,
      type: 'export',
      action: 'Reporte Exportado',
      description: 'Exportación de inventario a Excel (2,450 items)',
      module: 'inventario',
      user: 'Bodeguero Senior',
      timestamp: new Date(Date.now() - 3.5 * 3600000) // Hace 3.5 horas
    },
    {
      id: 5,
      type: 'update',
      action: 'Stock Corregido',
      description: 'Ajuste de inventario: Monitores Dell (Cantidad: -5)',
      module: 'inventario',
      user: 'Bodeguero Senior',
      timestamp: new Date(Date.now() - 5 * 3600000) // Hace 5 horas
    },
    {
      id: 6,
      type: 'create',
      action: 'Contrato Firmado',
      description: 'Nuevo contrato de prácticas: Carlos Díaz (Duración: 6 meses)',
      module: 'rrhh',
      user: 'Jefe de RRHH',
      timestamp: new Date(Date.now() - 1 * 86400000) // Hace 1 día
    }
  ];
  
  getIconByType(type: ActivityLog['type']): string {
    const icons: Record<ActivityLog['type'], string> = {
      create: 'plus',
      update: 'edit',
      delete: 'trash',
      login: 'log-in',
      export: 'download'
    };
    return icons[type];
  }
  
  getColorByModule(module: ActivityLog['module']): string {
    const colors: Record<ActivityLog['module'], string> = {
      rrhh: 'blue',
      remuneraciones: 'emerald',
      inventario: 'purple',
      auth: 'slate'
    };
    return colors[module];
  }
  
  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Hace unos segundos';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days === 1) return 'Ayer';
    return `Hace ${days} días`;
  }
}
