import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute } from '@angular/router';

interface Employee {
  id: number;
  rut: string;
  nombre: string;
  correo: string;
  cargo: string;
  tipo_contrato: 'Indefinido' | 'Plazo Fijo' | 'Honorarios';
  fechaIngreso: Date;
  estado: 'activo' | 'inactivo' | 'licencia';
  departamento?: string;
  config_remuneracion: {
    sueldo_base: number;
    afp: string;
    salud: string;
    movilizacion: number;
    colacion: number;
  };
}

export interface RegistroHorasExtra {
  id: number;
  empleadoId: number;
  empleado: string;
  cargo: string;
  rut: string;
  sueldoBase: number;
  fecha: string;
  tipoDia: 'laboral' | 'finde' | 'festivo';
  horas: number;
  recargo: number;
  montoTotal: number;
  autorizadoPor: string;
}

@Component({
  selector: 'app-rrhh',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './rrhh.component.html',
  styleUrls: ['./rrhh.component.css']
})
export class RrhhComponent implements OnInit {
  
  // Dependencias
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);

  // Tabs
  activeTab: 'general' | 'gestion' | 'ficha' | 'asistencia' | 'horasExtra' = 'general';
  

  // Estado CRUD
  showModal = false;
  isEditing = false;
  selectedEmployee: Employee | null = null;
  employeeForm: FormGroup;
  
  // Estado Asistencia Diaria
  fechaHoy: Date = new Date();
  showAsistenciaModal = false;
  selectedAsistencia: any = null;
  excepcionForm: FormGroup;

  // Estado Horas Extra
  horasExtraForm: FormGroup;
  historialHorasExtra: RegistroHorasExtra[] = [];
  
  asistenciaList: any[] = [
    { id: 1, rut: '11111111-1', nombre: 'Walter Hollub', cargo: 'Administrador del Sistema', estado: 'Presente', entrada: '08:00', salida: '17:00', diasVacaciones: 15, inasistenciasInjustificadas: 0 },
    { id: 2, rut: '22222222-2', nombre: 'Jordan Acevedo', cargo: 'Jefe de Recursos Humanos', estado: 'Presente', entrada: '08:00', salida: '17:00', diasVacaciones: 12, inasistenciasInjustificadas: 2 },
    { id: 3, rut: '33333333-3', nombre: 'Jasna Ramírez', cargo: 'Encargada de Remuneraciones', estado: 'Presente', entrada: '08:00', salida: '17:00', diasVacaciones: 15, inasistenciasInjustificadas: 0 },
    { id: 4, rut: '44444444-4', nombre: 'Juan Pablo Hernández', cargo: 'Encargado de Bodega', estado: 'Presente', entrada: '08:00', salida: '17:00', diasVacaciones: 5, inasistenciasInjustificadas: 0 },
    { id: 5, rut: '55555555-5', nombre: 'Valentina Torres Álvarez', cargo: 'Docente Especialidad Electromecánica', estado: 'Presente', entrada: '08:00', salida: '17:00', diasVacaciones: 0, inasistenciasInjustificadas: 3 },
    { id: 6, rut: '66666666-6', nombre: 'Ana Tijoux Merino', cargo: 'Psicóloga Convivencia Escolar', estado: 'Presente', entrada: '08:00', salida: '17:00', diasVacaciones: 10, inasistenciasInjustificadas: 1 }
  ];
  
  getRiskLevel(inasistencias: number): 'ok' | 'warning' | 'danger' {
    if (inasistencias >= 3) return 'danger';
    if (inasistencias >= 1) return 'warning';
    return 'ok';
  }
  
  // Configuración base del calendario de asistencia (Abril 2026)
  daysInMonth = Array.from({length: 30}, (_, i) => i + 1);
  
  getAttendanceStatus(employeeId: number, day: number): 'present' | 'absent' | 'leave' | 'weekend' {
    // TODO: El backend debe devolver la asistencia filtrada por employeeId
    const weekends = [4, 5, 11, 12, 18, 19, 25, 26];
    if (weekends.includes(day)) return 'weekend';
    
    // Simulación de datos variados por empleado (mock)
    if (employeeId === 4 && day >= 10) return 'leave'; // Francisca (Licencia)
    
    const absences = employeeId % 2 === 0 ? [3, 14] : [22];
    if (absences.includes(day)) return 'absent';
    
    const leaves = employeeId % 3 === 0 ? [8, 9, 10] : [];
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
      tipo_contrato: 'Indefinido',
      fechaIngreso: new Date('2021-03-15'),
      estado: 'activo',
      departamento: 'Informática',
      config_remuneracion: { sueldo_base: 2500000, afp: 'Habitat', salud: 'Fonasa', movilizacion: 50000, colacion: 55000 }
    },
    {
      id: 2,
      rut: '23456789-0',
      nombre: 'María González Ruiz',
      correo: 'maria.gonzalez@liceo.cl',
      cargo: 'Jefa de Recursos Humanos',
      tipo_contrato: 'Indefinido',
      fechaIngreso: new Date('2019-07-01'),
      estado: 'activo',
      departamento: 'Administración',
      config_remuneracion: { sueldo_base: 2800000, afp: 'Capital', salud: 'Isapre Cruz Blanca', movilizacion: 45000, colacion: 50000 }
    },
    {
      id: 3,
      rut: '34567890-1',
      nombre: 'Roberto López Silva',
      correo: 'roberto.lopez@liceo.cl',
      cargo: 'Encargado de Mantenimiento',
      tipo_contrato: 'Plazo Fijo',
      fechaIngreso: new Date('2020-01-20'),
      estado: 'activo',
      departamento: 'Operaciones',
      config_remuneracion: { sueldo_base: 1800000, afp: 'PlanVital', salud: 'Fonasa', movilizacion: 40000, colacion: 45000 }
    },
    {
      id: 4,
      rut: '45678901-2',
      nombre: 'Francisca Martínez Díaz',
      correo: 'francisca.martinez@liceo.cl',
      cargo: 'Secretaria Administrativa',
      tipo_contrato: 'Indefinido',
      fechaIngreso: new Date('2022-11-10'),
      estado: 'licencia',
      departamento: 'Administración',
      config_remuneracion: { sueldo_base: 1900000, afp: 'Modelo', salud: 'Fonasa', movilizacion: 40000, colacion: 50000 }
    },
    {
      id: 5,
      rut: '56789012-3',
      nombre: 'Carlos Rodríguez Fuentes',
      correo: 'carlos.rodriguez@liceo.cl',
      cargo: 'Profesor de Electricidad',
      tipo_contrato: 'Indefinido',
      fechaIngreso: new Date('2018-05-03'),
      estado: 'activo',
      departamento: 'Electromecánica',
      config_remuneracion: { sueldo_base: 2600000, afp: 'ProVida', salud: 'Fonasa', movilizacion: 42000, colacion: 48000 }
    }
  ];
  
  filteredEmployees: Employee[] = [];
  filteredAsistenciaList: any[] = [];

  constructor() {
    this.employeeForm = this.fb.group({
      id: [null],
      rut: ['', Validators.required],
      nombre: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      cargo: ['', Validators.required],
      tipo_contrato: ['Indefinido', Validators.required],
      departamento: ['', Validators.required],
      fechaIngreso: [new Date().toISOString().split('T')[0], Validators.required],
      estado: ['activo', Validators.required],
      // config_remuneracion — campos de la ficha remuneracional
      sueldo_base: [0, [Validators.required, Validators.min(500000)]],
      afp: ['', Validators.required],
      salud: ['Fonasa', Validators.required],
      movilizacion: [0, Validators.required],
      colacion: [0, Validators.required]
    });
    
    this.excepcionForm = this.fb.group({
      tipoExcepcion: ['atraso', Validators.required],
      horaEntradaReal: ['08:00'],
      minutosAtraso: [{value: 0, disabled: true}],
      justificativo: ['']
    });

    this.horasExtraForm = this.fb.group({
      empleadoId: ['', Validators.required],
      fecha: [new Date().toISOString().split('T')[0], Validators.required],
      horas: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      autorizadoPor: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.filteredEmployees = [...this.employees];
    this.filteredAsistenciaList = [...this.asistenciaList];
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const tab = params['tab'];
        if (['general', 'gestion', 'ficha', 'asistencia', 'horasExtra'].includes(tab)) {
          this.activeTab = tab as any;
        }
      }
    });
    
    // Calcular minutos de atraso dinámicamente
    this.excepcionForm.get('horaEntradaReal')?.valueChanges.subscribe(hora => {
      if (hora && this.excepcionForm.get('tipoExcepcion')?.value === 'atraso') {
        const [h, m] = hora.split(':').map(Number);
        const minutosLlegada = (h * 60) + m;
        const minutosOficial = (8 * 60); // 08:00
        const dif = minutosLlegada - minutosOficial;
        this.excepcionForm.get('minutosAtraso')?.setValue(dif > 0 ? dif : 0);
      }
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
  
  changeTab(tab: 'general' | 'gestion' | 'ficha' | 'asistencia' | 'horasExtra') {
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
        this.toastService.show('Datos actualizados correctamente.', 'success');
      }
    } else {
      newEmployee.id = Math.max(0, ...this.employees.map(e => e.id)) + 1;
      this.employees.push(newEmployee);
      this.toastService.show('Empleado registrado exitosamente.', 'success');
    }
    this.filteredEmployees = [...this.employees];
    this.closeModal();
  }

  deleteEmployee(id: number) {
    if (confirm('¿Está seguro de eliminar este empleado?')) {
      this.employees = this.employees.filter(e => e.id !== id);
      this.filteredEmployees = [...this.employees];
      this.toastService.show('Registro de empleado eliminado.', 'warning');
    }
  }

  onSearchEmployee(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredEmployees = this.employees.filter(e => 
      e.nombre.toLowerCase().includes(query) || 
      e.rut.toLowerCase().includes(query) ||
      e.cargo.toLowerCase().includes(query)
    );
  }

  onSearchAsistencia(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredAsistenciaList = this.asistenciaList.filter(e => 
      e.nombre.toLowerCase().includes(query) || 
      e.rut.toLowerCase().includes(query)
    );
  }

  // ==========================================
  // Registro de Horas Extra
  // ==========================================

  registrarHorasExtra() {
    if (this.horasExtraForm.invalid) {
      this.horasExtraForm.markAllAsTouched();
      return;
    }

    const formValues = this.horasExtraForm.value;
    const empleado = this.employees.find(e => e.id === Number(formValues.empleadoId));
    
    if (!empleado) return;

    // Detectar tipo de día
    const fechaObj = new Date(formValues.fecha);
    const dayOfWeek = fechaObj.getUTCDay(); // 0 = Domingo, 6 = Sábado
    // Simplificación: asume 0 o 6 como finde, el resto laboral. Festivos requieren API.
    const tipoDia = (dayOfWeek === 0 || dayOfWeek === 6) ? 'finde' : 'laboral';
    const recargo = tipoDia === 'laboral' ? 50 : 100;
    
    // Cálculo (Sueldo base simulado, en entorno real viene del backend/nómina)
    const sueldoBaseMoc = empleado.cargo.includes('Jefa') ? 2800000 : 2500000;
    const valorHoraNormal = (sueldoBaseMoc / 30) * 28 / 42;
    const recargoMultiplicador = 1 + (recargo / 100);
    const valorHoraExtra = valorHoraNormal * recargoMultiplicador;
    const montoTotal = valorHoraExtra * formValues.horas;

    const nuevoRegistro: RegistroHorasExtra = {
      id: Date.now(),
      empleadoId: empleado.id,
      empleado: empleado.nombre,
      cargo: empleado.cargo,
      rut: empleado.rut,
      sueldoBase: sueldoBaseMoc,
      fecha: formValues.fecha,
      tipoDia: tipoDia,
      horas: formValues.horas,
      recargo: recargo,
      montoTotal: Math.round(montoTotal),
      autorizadoPor: formValues.autorizadoPor
    };

    this.historialHorasExtra.unshift(nuevoRegistro);
    this.toastService.show('Registro de horas extra guardado con éxito.', 'success');
    
    this.horasExtraForm.patchValue({ 
      horas: 1, 
      autorizadoPor: '' 
    });
    this.horasExtraForm.markAsUntouched();
  }

  eliminarRegistroHE(id: number) {
    this.historialHorasExtra = this.historialHorasExtra.filter(h => h.id !== id);
    this.toastService.show('Registro eliminado.', 'warning');
  }

  // ==========================================
  // Métodos de Asistencia por Excepción
  // ==========================================

  openExcepcionModal(empleado: any) {
    this.selectedAsistencia = empleado;
    this.excepcionForm.reset({
      tipoExcepcion: 'atraso',
      horaEntradaReal: '08:00',
      minutosAtraso: 0,
      justificativo: ''
    });
    this.showAsistenciaModal = true;
  }

  closeExcepcionModal() {
    this.showAsistenciaModal = false;
    this.selectedAsistencia = null;
  }

  saveExcepcion() {
    if (this.excepcionForm.invalid) return;
    
    const formValue = this.excepcionForm.value;
    const emp = this.selectedAsistencia;
    const tipo = formValue.tipoExcepcion;
    
    const estadosMap: Record<string, string> = {
      'atraso': 'Atraso',
      'ausente': 'Ausente Injustificado',
      'licencia': 'Licencia Médica',
      'vacaciones': 'Vacaciones',
      'sin_goce': 'Permiso S/Goce'
    };
    
    emp.estado = estadosMap[tipo];
    
    if (tipo === 'atraso') {
      emp.entrada = formValue.horaEntradaReal;
      this.toastService.show(`Atraso de ${this.excepcionForm.get('minutosAtraso')?.value} min registrado para ${emp.nombre}`, 'warning');
    } else if (tipo === 'vacaciones') {
      emp.diasVacaciones = Math.max(0, emp.diasVacaciones - 1);
      this.toastService.show(`Día de vacaciones descontado a ${emp.nombre}. Saldo: ${emp.diasVacaciones}`, 'info');
    } else {
      emp.inasistenciasInjustificadas += 1;
      this.toastService.show(`Excepción ${estadosMap[tipo]} registrada.`, 'info');
    }
    
    this.closeExcepcionModal();
  }
}
