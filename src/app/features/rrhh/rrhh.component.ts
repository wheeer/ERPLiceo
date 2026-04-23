import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Employee {
  id: number;
  rut: string;
  nombre: string;
  correo: string;
  cargo: string;
  fechaIngreso: Date;
  estado: 'activo' | 'inactivo' | 'licencia';
}

@Component({
  selector: 'app-rrhh',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rrhh.component.html',
  styleUrls: ['./rrhh.component.css']
})
export class RrhhComponent {
  
  // Mock: Lista de 5 empleados
  employees: Employee[] = [
    {
      id: 1,
      rut: '12345678-9',
      nombre: 'Juan Carlos Pérez',
      correo: 'juan.perez@liceo.cl',
      cargo: 'Profesor de Programación',
      fechaIngreso: new Date('2021-03-15'),
      estado: 'activo'
    },
    {
      id: 2,
      rut: '23456789-0',
      nombre: 'María González Ruiz',
      correo: 'maria.gonzalez@liceo.cl',
      cargo: 'Jefa de Recursos Humanos',
      fechaIngreso: new Date('2019-07-01'),
      estado: 'activo'
    },
    {
      id: 3,
      rut: '34567890-1',
      nombre: 'Roberto López Silva',
      correo: 'roberto.lopez@liceo.cl',
      cargo: 'Encargado de Mantenimiento',
      fechaIngreso: new Date('2020-01-20'),
      estado: 'activo'
    },
    {
      id: 4,
      rut: '45678901-2',
      nombre: 'Francisca Martínez Díaz',
      correo: 'francisca.martinez@liceo.cl',
      cargo: 'Secretaria Administrativa',
      fechaIngreso: new Date('2022-11-10'),
      estado: 'licencia'
    },
    {
      id: 5,
      rut: '56789012-3',
      nombre: 'Carlos Rodríguez Fuentes',
      correo: 'carlos.rodriguez@liceo.cl',
      cargo: 'Profesor de Electricidad',
      fechaIngreso: new Date('2018-05-03'),
      estado: 'activo'
    }
  ];
  
  getStatusColor(status: Employee['estado']): string {
    const colors: Record<Employee['estado'], string> = {
      'activo': 'status-active',
      'inactivo': 'status-inactive',
      'licencia': 'status-leave'
    };
    return colors[status];
  }
  
  getStatusLabel(status: Employee['estado']): string {
    const labels: Record<Employee['estado'], string> = {
      'activo': 'Activo',
      'inactivo': 'Inactivo',
      'licencia': 'En Licencia'
    };
    return labels[status];
  }
  
  formatDate(date: Date): string {
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}
