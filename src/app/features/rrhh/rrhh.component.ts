import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AsistenciaComponent } from './asistencia/asistencia.component';

interface Employee {
  id: number;
  rut: string;
  nombre: string;
  correo: string;
  cargo: string;
  fechaIngreso: Date;
  estado: 'activo' | 'inactivo' | 'licencia';
  departamento: string;
  contrato?: string;
}

@Component({
  selector: 'app-rrhh',
  standalone: true,
  // Aquí añadimos RouterModule y AsistenciaComponent
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AsistenciaComponent],
  templateUrl: './rrhh.component.html',
  styleUrls: ['./rrhh.component.css']
})

export class RrhhComponent implements OnInit {
  
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  // CORRECCIÓN 1: Se agregó 'ficha' a las opciones permitidas
  activeTab: 'general' | 'gestion' | 'asistencia' | 'ficha' = 'general';

  showModal = false;
  isEditing = false;
  selectedEmployee: Employee | null = null;
  employeeForm: FormGroup;
  
  daysInMonth = Array.from({length: 30}, (_, i) => i + 1);

  employees: Employee[] = [
    {
      id: 1,
      rut: '12345678-9',
      nombre: 'Juan Carlos Pérez',
      correo: 'juan.perez@liceo.cl',
      cargo: 'Profesor de Programación',
      fechaIngreso: new Date('2021-03-15'),
      estado: 'activo',
      departamento: 'Informática',
      contrato: 'Indefinido'
    },
    {
      id: 2,
      rut: '23456789-0',
      nombre: 'María González Ruiz',
      correo: 'maria.gonzalez@liceo.cl',
      cargo: 'Jefa de Recursos Humanos',
      fechaIngreso: new Date('2019-07-01'),
      estado: 'activo',
      departamento: 'Administración',
      contrato: 'Plazo Fijo'
    },
    {
      id: 3,
      rut: '34567890-1',
      nombre: 'Roberto López Silva',
      correo: 'roberto.lopez@liceo.cl',
      cargo: 'Encargado de Mantenimiento',
      fechaIngreso: new Date('2020-01-20'),
      estado: 'activo',
      departamento: 'Operaciones',
      contrato: 'Indefinido'
    },
    {
      id: 4,
      rut: '11223344-5',
      nombre: 'Pedro Silva',
      cargo: 'Docente Electromecánica',
      correo: 'p.silva@liceo.cl',
      fechaIngreso: new Date('2023-05-10'),
      estado: 'licencia',
      departamento: 'Electromecánica',
      contrato: 'Honorarios'
    }
  ];

  constructor() {
    this.employeeForm = this.fb.group({
      id: [null],
      rut: ['', [Validators.required]],
      nombre: ['', [Validators.required]],
      correo: ['', [Validators.required, Validators.email]],
      cargo: ['', [Validators.required]],
      departamento: ['', [Validators.required]],
      fechaIngreso: [new Date().toISOString().split('T')[0], [Validators.required]],
      estado: ['activo', [Validators.required]],
      contrato: ['Indefinido']
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] && ['general', 'gestion', 'asistencia', 'ficha'].includes(params['tab'])) {
        this.activeTab = params['tab'] as any;
      }
    });
  }

  // CORRECCIÓN 2: Se incluyó 'ficha' como parámetro válido
  changeTab(tab: 'general' | 'gestion' | 'asistencia' | 'ficha') {
    this.activeTab = tab;
    if (tab !== 'ficha') {
      this.selectedEmployee = null;
    }
  }

  // CORRECCIÓN 3: Función para ver la ficha
  viewFicha(employee: Employee) {
    this.selectedEmployee = employee;
    this.activeTab = 'ficha';
  }

  // CORRECCIÓN 4: Función para cerrar el modal
  closeModal() {
    this.showModal = false;
  }

  marcarAsistencia(employee: Employee, estadoAsistencia: string) {
    alert(`Asistencia registrada: ${employee.nombre} ha sido marcado como ${estadoAsistencia}.`);
  }

  getAttendanceStatus(employeeId: number, day: number): 'present' | 'absent' | 'leave' | 'weekend' {
    const weekends = [4, 5, 11, 12, 18, 19, 25, 26]; 
    if (weekends.includes(day)) return 'weekend';
    if (employeeId === 4 && day >= 10) return 'leave'; 
    return (day + employeeId) % 7 === 0 ? 'absent' : 'present'; 
  }

  openNewModal() {
    this.isEditing = false;
    this.employeeForm.reset({
      estado: 'activo',
      fechaIngreso: new Date().toISOString().split('T')[0],
      contrato: 'Indefinido'
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

  saveEmployee() {
    if (this.employeeForm.invalid) return;

    const formValue = this.employeeForm.value;
    const employeeData: Employee = {
      ...formValue,
      fechaIngreso: new Date(formValue.fechaIngreso)
    };

    if (this.isEditing) {
      const index = this.employees.findIndex(e => e.id === employeeData.id);
      if (index !== -1) this.employees[index] = employeeData;
    } else {
      employeeData.id = Math.max(0, ...this.employees.map(e => e.id)) + 1;
      this.employees.push(employeeData);
    }
    this.showModal = false;
  }

  deleteEmployee(id: number) {
    if (confirm('¿Está seguro de eliminar este registro?')) {
      this.employees = this.employees.filter(e => e.id !== id);
    }
  }

  // CORRECCIÓN 5: Función para gestionar los colores de estado
  getStatusColor(status: string): string {
    const colors: any = {
      'activo': 'status-active',
      'inactivo': 'status-inactive',
      'licencia': 'status-leave'
    };
    return colors[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: any = { 'activo': 'Activo', 'inactivo': 'Inactivo', 'licencia': 'Licencia' };
    return labels[status] || status;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-CL');
  }
}