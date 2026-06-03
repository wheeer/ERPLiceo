import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute } from '@angular/router';
import { RrhhService } from './rrhh.service';

// ==========================================
// INTERFACES ANTIGUAS
// ==========================================
export interface Employee {
  id: string | number;
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
  id: string | number;
  empleadoId: string | number;
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

export interface AsistenciaEmpleado {
  id: number;
  rut: string;
  nombre: string;
  cargo: string;
  estado: string;
  entrada?: string;
  salida?: string;
  diasVacaciones: number;
  inasistenciasInjustificadas: number;
}

// ==========================================
// NUEVAS INTERFACES (Issue #21)
// ==========================================
export interface EmpleadoCalendario {
  rut: string;
  nombre_completo?: string;
}

export interface AsistenciaDia {
  fecha: string;
  estado: string;
}

export interface DiaCalendario {
  vacio: boolean;
  numero?: number;
  fechaCompleta?: string;
  estado?: string;
}

export type TabType = 'general' | 'gestion' | 'ficha' | 'asistencia' | 'horasExtra' | 'calendario';

@Component({
  selector: 'app-rrhh',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './rrhh.component.html',
  styleUrls: ['./rrhh.component.css']
})
export class RrhhComponent implements OnInit {

  // ==========================================
  // DEPENDENCIAS (Unificadas al estilo moderno)
  // ==========================================
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private rrhhService = inject(RrhhService);
  private http = inject(HttpClient);

  // ==========================================
  // ESTADO ANTIGUO (CRUD, Tabs, Horas Extra)
  // ==========================================
  activeTab: TabType = 'general';
  isLoading = true;
  viewingForm = false;
  isEditing = false;
  selectedEmployee: Employee | null = null;
  employeeForm: FormGroup;
  isSaving = false;
  mostrarSoloActivos: boolean = false;

  fechaHoy: Date = new Date();
  showAsistenciaModal = false;
  selectedAsistencia: AsistenciaEmpleado | null = null;
  excepcionForm: FormGroup;

  horasExtraForm: FormGroup;
  historialHorasExtra: RegistroHorasExtra[] = [];

  asistenciaList: AsistenciaEmpleado[] = [
    { id: 1, rut: '11111111-1', nombre: 'Walter Hollub', cargo: 'Administrador del Sistema', estado: 'Presente', entrada: '08:00', salida: '17:00', diasVacaciones: 15, inasistenciasInjustificadas: 0 },
    { id: 2, rut: '22222222-2', nombre: 'Jordan Acevedo', cargo: 'Jefe de Recursos Humanos', estado: 'Presente', entrada: '08:00', salida: '17:00', diasVacaciones: 12, inasistenciasInjustificadas: 2 },
    { id: 3, rut: '33333333-3', nombre: 'Jasna Ramírez', cargo: 'Encargada de Remuneraciones', estado: 'Presente', entrada: '08:00', salida: '17:00', diasVacaciones: 15, inasistenciasInjustificadas: 0 },
    { id: 4, rut: '44444444-4', nombre: 'Juan Pablo Hernández', cargo: 'Encargado de Bodega', estado: 'Presente', entrada: '08:00', salida: '17:00', diasVacaciones: 5, inasistenciasInjustificadas: 0 },
    { id: 5, rut: '55555555-5', nombre: 'Valentina Torres Álvarez', cargo: 'Docente Especialidad Electromecánica', estado: 'Presente', entrada: '08:00', salida: '17:00', diasVacaciones: 0, inasistenciasInjustificadas: 3 },
    { id: 6, rut: '66666666-6', nombre: 'Ana Tijoux Merino', cargo: 'Psicóloga Convivencia Escolar', estado: 'Presente', entrada: '08:00', salida: '17:00', diasVacaciones: 10, inasistenciasInjustificadas: 1 }
  ];

  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  filteredAsistenciaList: AsistenciaEmpleado[] = [];

  // ==========================================
  // ESTADO NUEVO (Issue #21 - Calendario)
  // ==========================================
  mesSeleccionado: number;
  anioSeleccionado: number;
  empleadoSeleccionado: string = '';
  empleadosCalendario: EmpleadoCalendario[] = [];
  asistenciaMensual: AsistenciaDia[] = [];
  diasCalendario: DiaCalendario[] = [];

  totalPresentes: number = 0;
  totalAusentes: number = 0;
  totalTardanzas: number = 0;
  totalLicencias: number = 0;

  meses = [
    { value: 1, nombre: 'Enero' }, { value: 2, nombre: 'Febrero' },
    { value: 3, nombre: 'Marzo' }, { value: 4, nombre: 'Abril' },
    { value: 5, nombre: 'Mayo' }, { value: 6, nombre: 'Junio' },
    { value: 7, nombre: 'Julio' }, { value: 8, nombre: 'Agosto' },
    { value: 9, nombre: 'Septiembre' }, { value: 10, nombre: 'Octubre' },
    { value: 11, nombre: 'Noviembre' }, { value: 12, nombre: 'Diciembre' }
  ];
  anios = [2024, 2025, 2026, 2027];

  // ==========================================
  // PAGINACIÓN (Antiguo)
  // ==========================================
  paginaActual = 1;
  itemsPorPagina = 20;
  opcionesPorPagina = [10, 20, 50, 100];

  get empleadosPaginados(): Employee[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.filteredEmployees.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginasEmpleados(): number {
    return Math.ceil(this.filteredEmployees.length / this.itemsPorPagina) || 1;
  }

  get rangoMostradoEmpleados(): string {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina + 1;
    const fin = Math.min(this.paginaActual * this.itemsPorPagina, this.filteredEmployees.length);
    return `${inicio}-${fin} de ${this.filteredEmployees.length}`;
  }

  get asistenciaPaginada(): AsistenciaEmpleado[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.filteredAsistenciaList.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginasAsistencia(): number {
    return Math.ceil(this.filteredAsistenciaList.length / this.itemsPorPagina) || 1;
  }

  get rangoMostradoAsistencia(): string {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina + 1;
    const fin = Math.min(this.paginaActual * this.itemsPorPagina, this.filteredAsistenciaList.length);
    return `${inicio}-${fin} de ${this.filteredAsistenciaList.length}`;
  }

  paginaAnterior() {
    if (this.paginaActual > 1) this.paginaActual--;
  }

  siguientePaginaActiva() {
    const total = (this.activeTab === 'general' || this.activeTab === 'gestion') ? this.totalPaginasEmpleados : this.totalPaginasAsistencia;
    if (this.paginaActual < total) this.paginaActual++;
  }

  cambiarItemsPorPagina(event: Event) {
    this.itemsPorPagina = Number((event.target as HTMLSelectElement).value);
    this.paginaActual = 1;
  }

  // ==========================================
  // CONSTRUCTOR
  // ==========================================
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
      sueldo_base: [0, [Validators.required, Validators.min(500000)]],
      afp: ['', Validators.required],
      salud: ['', Validators.required],
      movilizacion: [0, Validators.required],
      colacion: [0, Validators.required]
    });

    this.excepcionForm = this.fb.group({
      tipoExcepcion: ['atraso', Validators.required],
      horaEntradaReal: ['08:00'],
      minutosAtraso: [{ value: 0, disabled: true }],
      justificativo: ['']
    });

    this.horasExtraForm = this.fb.group({
      empleadoId: ['', Validators.required],
      fecha: [new Date().toISOString().split('T')[0], Validators.required],
      horas: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      autorizadoPor: ['', Validators.required]
    });

    const hoy = new Date();
    this.mesSeleccionado = hoy.getMonth() + 1;
    this.anioSeleccionado = hoy.getFullYear();
  }

  // ==========================================
  // ON INIT
  // ==========================================
  ngOnInit() {
    this.cargarDatosEmpleados();
    this.filteredAsistenciaList = [...this.asistenciaList];

    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const tab = params['tab'];
        if (['general', 'gestion', 'ficha', 'asistencia', 'horasExtra'].includes(tab)) {
          this.activeTab = tab as TabType;
        }
      }
    });

    this.excepcionForm.get('horaEntradaReal')?.valueChanges.subscribe((hora: string | null) => {
      const tipoExcepcionActual = this.excepcionForm.get('tipoExcepcion')?.value || '';
      if (hora && tipoExcepcionActual === 'atraso') {
        const [h, m] = hora.split(':').map(Number);
        const minutosLlegada = (h * 60) + m;
        const minutosOficial = (8 * 60);
        const dif = minutosLlegada - minutosOficial;
        this.excepcionForm.get('minutosAtraso')?.setValue(dif > 0 ? dif : 0);
      }
    });

    this.obtenerAsistencia();
  }

  // ==========================================
  // LÓGICA NUEVA: CALENDARIO (Issue #21)
  // ==========================================

  obtenerAsistencia(): void {
    let url = `http://127.0.0.1:8000/api/asistencia/${this.mesSeleccionado}/${this.anioSeleccionado}/`;

    if (this.empleadoSeleccionado) {
      url += `?rut=${this.empleadoSeleccionado}`;
    }

    this.http.get<any>(url).subscribe({
      next: (response) => {
        // En el nuevo API, la asistencia viene en response.data
        const registros = response.data || [];

        // Mapear los registros al formato esperado por el frontend
        // Si no hay empleado seleccionado, mostramos todos; de lo contrario filtramos (aunque el backend ya lo filtra)
        this.asistenciaMensual = registros.map((reg: any) => ({
          fecha: reg.fecha,
          estado: reg.estado
        }));

        // Poblamos los empleados del calendario desde la lista global ya cargada
        this.empleadosCalendario = this.employees.map(e => ({
          rut: e.rut,
          nombre_completo: e.nombre
        }));

        // EXPERIENCIA DE USUARIO: Si es la primera carga y no hay empleado seleccionado, 
        // seleccionamos el primero automáticamente para que el calendario no se vea vacío.
        if (!this.empleadoSeleccionado && this.empleadosCalendario.length > 0) {
          this.empleadoSeleccionado = this.empleadosCalendario[0].rut;
          this.obtenerAsistencia();
          return;
        }

        this.generarCalendario();
        this.calcularTotales();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error al obtener la asistencia del calendario:', error);
      }
    });
  }

  calcularTotales(): void {
    this.totalPresentes = 0;
    this.totalAusentes = 0;
    this.totalTardanzas = 0;
    this.totalLicencias = 0;

    this.diasCalendario.forEach(dia => {
      const estado = dia.estado ? dia.estado.toLowerCase() : '';

      // Ignorar fines de semana y días vacíos/sin registro
      if (!estado || estado === 'sin registro' || estado === 'finde') return;

      if (estado.includes('presente')) {
        this.totalPresentes++;
      } else if (estado.includes('ausente')) {
        this.totalAusentes++;
      } else if (estado.includes('atraso') || estado.includes('tardanza')) {
        this.totalTardanzas++;
      } else if (estado.includes('licencia') || estado.includes('vacaciones') || estado.includes('goce')) {
        this.totalLicencias++; // agrupar licencias y permisos
      }
    });
  }

  generarCalendario(): void {
    this.diasCalendario = [];

    // Cantidad de días en el mes seleccionado
    const diasEnMes = new Date(this.anioSeleccionado, this.mesSeleccionado, 0).getDate();
    
    const primerDiaFecha = new Date(this.anioSeleccionado, this.mesSeleccionado - 1, 1);
    let diaSemana = primerDiaFecha.getDay();

    // Ajustar para que la semana empiece en Lunes (0)
    diaSemana = diaSemana === 0 ? 6 : diaSemana - 1;

    // Rellenar espacios vacíos al principio
    for (let i = 0; i < diaSemana; i++) {
      this.diasCalendario.push({ vacio: true });
    }

    // Mapa de asistencias guardadas en BD (día -> estado)
    const asistenciaMap: Record<number, string> = {};
    if (this.asistenciaMensual && this.asistenciaMensual.length > 0) {
      this.asistenciaMensual.forEach(dia => {
        const partesFecha = dia.fecha.split('-');
        const numeroDia = parseInt(partesFecha[2], 10);
        asistenciaMap[numeroDia] = dia.estado;
      });
    }

    const hoy = new Date();
    const esMesActual = this.anioSeleccionado === hoy.getFullYear() && this.mesSeleccionado === (hoy.getMonth() + 1);
    const diaActual = hoy.getDate();
    const esMesPasado = this.anioSeleccionado < hoy.getFullYear() || (this.anioSeleccionado === hoy.getFullYear() && this.mesSeleccionado < (hoy.getMonth() + 1));

    // Generar cada día del mes
    for (let i = 1; i <= diasEnMes; i++) {
      const fechaObj = new Date(this.anioSeleccionado, this.mesSeleccionado - 1, i);
      const esFinde = fechaObj.getDay() === 0 || fechaObj.getDay() === 6;

      let estadoFinal = 'Sin registro';

      if (asistenciaMap[i]) {
        estadoFinal = asistenciaMap[i]; // Si hay registro en BD, este manda.
      } else if (esFinde) {
        estadoFinal = 'Finde';
      } else if (esMesPasado || (esMesActual && i <= diaActual)) {
        // Modo Zen: Si el día ya pasó, no es finde y no tiene registro negativo en BD, se asume presente por defecto.
        estadoFinal = 'Presente';
      }

      this.diasCalendario.push({
        vacio: false,
        numero: i,
        fechaCompleta: `${this.anioSeleccionado}-${this.mesSeleccionado.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`,
        estado: estadoFinal
      });
    }
  }

  // ==========================================
  // LÓGICA ANTIGUA (CRUD y Tablas) MANTENIDA INTACTA
  // ==========================================

  cargarDatosEmpleados(): void {
    this.isLoading = true;
    this.rrhhService.obtenerEmpleados(this.mostrarSoloActivos).subscribe({
      next: (response: any) => {
        const datosReales = response.data ? response.data : response;
        this.employees = datosReales.map((emp: any) => ({
          id: emp._id || emp.id,
          rut: emp.rut,
          nombre: emp.nombre_completo || emp.nombre || 'Sin nombre',
          correo: emp.correo || 'No registrado',
          departamento: emp.departamento || 'Sin departamento',
          cargo: emp.cargo,
          tipo_contrato: emp.tipo_contrato,
          fechaIngreso: emp.fecha_ingreso ? new Date(emp.fecha_ingreso) : (emp.fechaIngreso ? new Date(emp.fechaIngreso) : new Date()),
          estado: emp.estado || 'inactivo',
          config_remuneracion: emp.config_remuneracion || { 
            sueldo_base: emp.sueldo_base || 0, 
            afp: emp.afp || '', 
            salud: emp.salud || '', 
            movilizacion: emp.movilizacion || 0, 
            colacion: emp.colacion || 0 
          }
        }));

        this.filteredEmployees = [...this.employees];

        // Mapear los empleados reales a la lista de asistencia diaria (Modo Zen por defecto)
        this.asistenciaList = this.employees.map((emp: any) => ({
          id: emp.id,
          rut: emp.rut,
          nombre: emp.nombre,
          cargo: emp.cargo,
          estado: 'Presente',
          entrada: '08:00',
          salida: '17:00',
          diasVacaciones: 15,
          inasistenciasInjustificadas: 0
        }));
        this.filteredAsistenciaList = [...this.asistenciaList];

        // Populate the calendar dropdown from the real employees list
        this.empleadosCalendario = this.employees.map(e => ({
          rut: e.rut,
          nombre_completo: e.nombre
        }));

        // If no employee is selected in the calendar yet, select the first one and fetch its specific attendance
        if (!this.empleadoSeleccionado && this.empleadosCalendario.length > 0) {
          this.empleadoSeleccionado = this.empleadosCalendario[0].rut;
          this.obtenerAsistencia();
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error al cargar empleados desde Mongo:', error);
        this.toastService.show('Error al conectar con la base de datos', 'error');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleFiltroActivos(): void {
    this.mostrarSoloActivos = !this.mostrarSoloActivos;
    this.cargarDatosEmpleados();
  }

  getRiskLevel(inasistencias: number): 'ok' | 'warning' | 'danger' {
    if (inasistencias >= 3) return 'danger';
    if (inasistencias >= 1) return 'warning';
    return 'ok';
  }



  getStatusColor(status: Employee['estado']): string {
    const colors: Record<Employee['estado'], string> = {
      'activo': 'status-active',
      'inactivo': 'status-inactive',
      'licencia': 'status-leave'
    };
    return colors[status] || 'status-inactive';
  }

  getStatusLabel(status: Employee['estado']): string {
    const labels: Record<Employee['estado'], string> = {
      'activo': 'Activo',
      'inactivo': 'Inactivo',
      'licencia': 'En Licencia'
    };
    return labels[status] || 'Desconocido';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  changeTab(tab: TabType) {
    this.activeTab = tab;
    this.paginaActual = 1;

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
      tipo_contrato: 'Indefinido',
      departamento: '',
      afp: '',
      salud: '',
      sueldo_base: null,
      movilizacion: null,
      colacion: null,
      fechaIngreso: new Date().toISOString().split('T')[0]
    });
    this.viewingForm = true;
  }

  openEditModal(employee: Employee) {
    this.isEditing = true;
    this.selectedEmployee = employee;
    this.employeeForm.patchValue({
      ...employee,
      fechaIngreso: employee.fechaIngreso.toISOString().split('T')[0],
      sueldo_base: employee.config_remuneracion?.sueldo_base || 0,
      afp: employee.config_remuneracion?.afp || '',
      salud: employee.config_remuneracion?.salud || '',
      movilizacion: employee.config_remuneracion?.movilizacion || 0,
      colacion: employee.config_remuneracion?.colacion || 0
    });
    this.viewingForm = true;
  }

  closeForm() {
    this.viewingForm = false;
  }

  saveEmployee() {
    if (this.employeeForm.invalid) return;

    this.isSaving = true;
    const rawData = this.employeeForm.getRawValue();

    // Adaptar los datos al formato que espera el backend (y que tienen los registros antiguos)
    const empleadoData = {
      ...rawData,
      nombre_completo: rawData.nombre,
      fecha_ingreso: rawData.fechaIngreso,
      config_remuneracion: {
        sueldo_base: rawData.sueldo_base,
        afp: rawData.afp,
        salud: rawData.salud,
        movilizacion: rawData.movilizacion,
        colacion: rawData.colacion
      }
    };

    // Opcional: Eliminar los campos planos para no ensuciar la BD
    delete empleadoData.sueldo_base;
    delete empleadoData.afp;
    delete empleadoData.salud;
    delete empleadoData.movilizacion;
    delete empleadoData.colacion;

    if (this.isEditing) {
      this.rrhhService.actualizarEmpleado(empleadoData.rut, empleadoData).subscribe({
        next: (res: any) => {
          this.toastService.show('Empleado actualizado correctamente', 'success');
          this.isSaving = false;
          this.closeForm();
          this.cargarDatosEmpleados();
        },
        error: (err: any) => {
          this.isSaving = false;
          const msg = err.error?.error || 'Error al actualizar empleado';
          this.toastService.show(msg, 'error');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.rrhhService.crearEmpleado(empleadoData).subscribe({
        next: (res: any) => {
          this.toastService.show('Empleado registrado correctamente', 'success');
          this.isSaving = false;
          this.closeForm();
          this.cargarDatosEmpleados();
        },
        error: (err: any) => {
          this.isSaving = false;
          const msg = err.error?.error || 'Error al registrar empleado';
          this.toastService.show(msg, 'error');
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteEmployee(rut: string) {
    if (confirm('¿Está seguro de dar de baja este empleado?')) {
      this.rrhhService.darDeBajaEmpleado(rut).subscribe({
        next: () => {
          this.toastService.show('Empleado dado de baja exitosamente.', 'success');
          this.cargarDatosEmpleados();
        },
        error: (err: any) => {
          const msg = err.error?.error || 'Error al dar de baja empleado';
          this.toastService.show(msg, 'error');
        }
      });
    }
  }

  onSearchEmployee(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredEmployees = this.employees.filter(e =>
      e.nombre.toLowerCase().includes(query) ||
      e.rut.toLowerCase().includes(query) ||
      e.cargo.toLowerCase().includes(query)
    );
    this.paginaActual = 1;
  }

  onSearchAsistencia(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredAsistenciaList = this.asistenciaList.filter(e =>
      e.nombre.toLowerCase().includes(query) ||
      e.rut.toLowerCase().includes(query)
    );
    this.paginaActual = 1;
  }

  registrarHorasExtra() {
    if (this.horasExtraForm.invalid) return;

    this.isSaving = true;

    setTimeout(() => {
      const data = this.horasExtraForm.value;
      const empleado = this.employees.find(e => e.id == data.empleadoId);

      if (empleado) {
        this.historialHorasExtra.unshift({
          id: Date.now(),
          fecha: data.fecha,
          empleadoId: empleado.id,
          empleado: empleado.nombre,
          cargo: empleado.cargo,
          rut: empleado.rut,
          sueldoBase: empleado.config_remuneracion.sueldo_base,
          tipoDia: 'laboral',
          horas: data.horas,
          recargo: 50,
          montoTotal: 0,
          autorizadoPor: data.autorizadoPor
        });

        this.toastService.show(`Se han registrado ${data.horas} hrs para ${empleado.nombre}`, 'success');

        this.horasExtraForm.reset({
          fecha: new Date().toISOString().split('T')[0],
          horas: 1
        });
      }

      this.isSaving = false;
      this.cdr.detectChanges();
    }, 1500);
  }

  eliminarRegistroHE(id: string | number) {
    this.historialHorasExtra = this.historialHorasExtra.filter(h => h.id !== id);
    this.toastService.show('Registro eliminado.', 'warning');
  }

  openExcepcionModal(empleado: AsistenciaEmpleado) {
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

    this.isSaving = true;

    const formValue = this.excepcionForm.getRawValue();
    const emp = this.selectedAsistencia;
    if (!emp) {
      this.isSaving = false;
      return;
    }

    const tipo = formValue.tipoExcepcion;

    const estadosMap: Record<string, string> = {
      'atraso': 'Atraso',
      'ausente': 'Ausente Injustificado',
      'licencia': 'Licencia Médica',
      'vacaciones': 'Vacaciones',
      'sin_goce': 'Permiso S/Goce'
    };

    const estadoFinal = estadosMap[tipo] || 'Ausente Injustificado';
    const fechaFmt = `${this.fechaHoy.getFullYear()}-${(this.fechaHoy.getMonth() + 1).toString().padStart(2, '0')}-${this.fechaHoy.getDate().toString().padStart(2, '0')}`;

    const payload: any[] = [{
      rut: emp.rut,
      estado: estadoFinal,
      fecha: fechaFmt,
      horas_extra: 0,
      comentario: formValue.justificativo || ''
    }];

    if (tipo === 'atraso' && formValue.horaEntradaReal) {
      payload[0].hora_entrada = formValue.horaEntradaReal;
    }

    this.rrhhService.registrarAsistenciaDiaria(payload).subscribe({
      next: (res) => {
        emp.estado = estadoFinal;

        if (tipo === 'atraso') {
          emp.entrada = formValue.horaEntradaReal;
          this.toastService.show(`Atraso de ${formValue.minutosAtraso} min registrado para ${emp.nombre}`, 'warning');
        } else if (tipo === 'vacaciones') {
          emp.diasVacaciones = Math.max(0, emp.diasVacaciones - 1);
          this.toastService.show(`Día de vacaciones descontado a ${emp.nombre}. Saldo: ${emp.diasVacaciones}`, 'info');
        } else {
          emp.inasistenciasInjustificadas += 1;
          this.toastService.show(`Excepción ${estadoFinal} registrada.`, 'info');
        }

        this.isSaving = false;
        this.closeExcepcionModal();
        
        // Refrescar calendario para que se vea reflejado el cambio
        this.obtenerAsistencia();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSaving = false;
        const msg = err.error?.message || 'Error al guardar la excepción. Posible duplicado.';
        this.toastService.show(msg, 'error');
        this.cdr.detectChanges();
      }
    });
  }
}