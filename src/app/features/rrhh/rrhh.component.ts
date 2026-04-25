import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

interface Employee {
  id: number;
  rut: string;
  nombre: string;
  correo: string;
  cargo: string;
  fechaIngreso: Date;
  estado: 'activo' | 'inactivo' | 'licencia';
  departamento?: string;
}

@Component({
  selector: 'app-rrhh',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './rrhh.component.html',
  styleUrls: ['./rrhh.component.css']
})
export class RrhhComponent {
  
  // Dependencias
  private fb = inject(FormBuilder);

  // Tabs
  activeTab: 'general' | 'gestion' | 'ficha' = 'general';
  
  // Vistas (General)
  viewMode: 'table' | 'calendar' = 'table';
  
  // Estado CRUD
  showModal = false;
  isEditing = false;
  selectedEmployee: Employee | null = null;
  employeeForm: FormGroup;
  
  // Configuración base del calendario de asistencia (Abril 2026)
  daysInMonth = Array.from({length: 30}, (_, i) => i + 1);
  
  getAttendanceStatus(day: number): 'present' | 'absent' | 'leave' | 'weekend' {
    const weekends = [4, 5, 11, 12, 18, 19, 25, 26];
    if (weekends.includes(day)) return 'weekend';
    
    const absences = [3, 14, 22];
    if (absences.includes(day)) return 'absent';
    
    const leaves = [8, 9, 10];
    if (leaves.includes(day)) return 'leave';
    
    return 'present';
  }

  // TODO: Reemplazar con llamada al servicio de empleados (backend pendiente)
  employees: Employee[] = [
    {
      id: 1,
      rut: '12345678-9',
      nombre: 'Juan Carlos Pérez',
      correo: 'juan.perez@liceo.cl',
      cargo: 'Profesor de Programación',
      fechaIngreso: new Date('2021-03-15'),
      estado: 'activo',
      departamento: 'Informática'
    },
    {
      id: 2,
      rut: '23456789-0',
      nombre: 'María González Ruiz',
      correo: 'maria.gonzalez@liceo.cl',
      cargo: 'Jefa de Recursos Humanos',
      fechaIngreso: new Date('2019-07-01'),
      estado: 'activo',
      departamento: 'Administración'
    },
    {
      id: 3,
      rut: '34567890-1',
      nombre: 'Roberto López Silva',
      correo: 'roberto.lopez@liceo.cl',
      cargo: 'Encargado de Mantenimiento',
      fechaIngreso: new Date('2020-01-20'),
      estado: 'activo',
      departamento: 'Operaciones'
    },
    {
      id: 4,
      rut: '45678901-2',
      nombre: 'Francisca Martínez Díaz',
      correo: 'francisca.martinez@liceo.cl',
      cargo: 'Secretaria Administrativa',
      fechaIngreso: new Date('2022-11-10'),
      estado: 'licencia',
      departamento: 'Administración'
    },
    {
      id: 5,
      rut: '56789012-3',
      nombre: 'Carlos Rodríguez Fuentes',
      correo: 'carlos.rodriguez@liceo.cl',
      cargo: 'Profesor de Electricidad',
      fechaIngreso: new Date('2018-05-03'),
      estado: 'activo',
      departamento: 'Electromecánica'
    }
  ];

  constructor() {
    this.employeeForm = this.fb.group({
      id: [null],
      rut: ['', Validators.required],
      nombre: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      cargo: ['', Validators.required],
      departamento: ['', Validators.required],
      fechaIngreso: [new Date().toISOString().split('T')[0], Validators.required],
      estado: ['activo', Validators.required]
    });
  }
  
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
    return new Date(date).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  // ==========================================
  // Métodos de navegación y gestión de estado
  // ==========================================
  
  changeTab(tab: 'general' | 'gestion' | 'ficha') {
    this.activeTab = tab;
    if (tab !== 'ficha') {
      this.selectedEmployee = null;
    }
  }

  viewFicha(employee: Employee) {
    this.selectedEmployee = employee;
    this.activeTab = 'ficha';
  }

  openNewModal() {
    this.isEditing = false;
    this.employeeForm.reset({
      estado: 'activo',
      fechaIngreso: new Date().toISOString().split('T')[0]
    });
    this.showModal = true;
  }

  openEditModal(employee: Employee) {
    this.isEditing = true;
    this.employeeForm.patchValue({
      ...employee,
      fechaIngreso: new Date(employee.fechaIngreso).toISOString().split('T')[0]
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveEmployee() {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    const formValue = this.employeeForm.value;
    const newEmployee: Employee = {
      ...formValue,
      fechaIngreso: new Date(formValue.fechaIngreso)
    };

    if (this.isEditing) {
      const index = this.employees.findIndex(e => e.id === newEmployee.id);
      if (index !== -1) {
        this.employees[index] = newEmployee;
      }
    } else {
      newEmployee.id = Math.max(0, ...this.employees.map(e => e.id)) + 1;
      this.employees.push(newEmployee);
    }
    this.closeModal();
  }

  deleteEmployee(id: number) {
    if (confirm('¿Está seguro de eliminar este empleado?')) {
      this.employees = this.employees.filter(e => e.id !== id);
    }
  }
}
