import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

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
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  userRole: string | null = null;
  
  // Métricas MVP (Propuesta de valor)
  metrics: any[] = [];

  // TODO: Reemplazar con llamada al servicio de auditoría (backend pendiente)
  activities: ActivityLog[] = [];

  filteredMetrics: any[] = [];
  filteredActivities: ActivityLog[] = [];

  ngOnInit() {
    this.userRole = this.authService.getUserRole();
    this.applyRoleFilters();
  }

  private applyRoleFilters() {
    if (this.userRole === 'Administrador_General') {
      this.filteredMetrics = [...this.metrics];
      this.filteredActivities = [...this.activities];
    } else if (this.userRole === 'Encargado_RRHH') {
      this.filteredMetrics = this.metrics.filter(m => m.icon === 'users' || m.icon === 'bell');
      this.filteredActivities = this.activities.filter(a => a.module === 'rrhh' || a.module === 'auth');
    } else if (this.userRole === 'Encargado_Remuneraciones') {
      this.filteredMetrics = this.metrics.filter(m => m.icon === 'file' || m.icon === 'bell');
      this.filteredActivities = this.activities.filter(a => a.module === 'remuneraciones' || a.module === 'auth');
    } else if (this.userRole === 'Encargado_Bodega') {
      this.filteredMetrics = this.metrics.filter(m => m.icon === 'alert' || m.icon === 'bell');
      this.filteredActivities = this.activities.filter(a => a.module === 'inventario' || a.module === 'auth');
    } else {
      this.filteredMetrics = [];
      this.filteredActivities = [];
    }
  }

  getRoleDisplayName(): string {
    if (!this.userRole) return 'Usuario';
    const cleanRole = this.userRole.replace('Encargado_', '').replace('Administrador_', 'Administrador ');
    return cleanRole;
  }
  
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
