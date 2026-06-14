import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';
import { RrhhService } from './rrhh.service';
import { forkJoin, of } from 'rxjs';
import { environment } from '../../../environments/environment';


// NUEVAS INTERFACES (Issue #21)
// ==========================================
export interface Empleado {
  id: string | number;
  rut: string;
  nombre: string;
  nombre_completo?: string;
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
  config_jornada?: {
    tipo_jornada: string;
    horas_contrato: number;
    dias_asistencia: number[];
  };
  excepciones_jornada?: {
    fecha: string;
    accion: 'agregar' | 'quitar';
  }[];
}

export interface RegistroHorasExtraNuevo {
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

export interface AsistenciaEmpleadoNuevo {
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

export type TabType = 'general' | 'gestion' | 'ficha' | 'asistencia' | 'horasExtra' | 'calendario' | 'global' | 'turnos';

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
  private router = inject(Router);
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
  selectedEmpleado: Empleado | null = null;
  employeeForm: FormGroup;
  isSaving = false;
  mostrarSoloActivos: boolean = false;

  fechaHoy: Date = new Date();
  showAsistenciaModal = false;
  selectedAsistencia: AsistenciaEmpleadoNuevo | null = null;
  showHorasExtraModal = false;
  _showExcepcionJornadaModal = false;
  excepcionForm: FormGroup;

  excepcionJornadaForm: FormGroup;

  diaSellado: boolean = false;
  verificandoDia: boolean = true;
  isSelleandoDia: boolean = false;
  esFindeHoy: boolean = false;

  horasExtraForm: FormGroup;
  historialHorasExtra: RegistroHorasExtraNuevo[] = [];

  asistenciaList: AsistenciaEmpleadoNuevo[] = [];

  employees: Empleado[] = [];
  filteredEmpleados: Empleado[] = [];
  filteredAsistenciaList: AsistenciaEmpleadoNuevo[] = [];

  // ==========================================
  // ESTADO NUEVO (Issue #21 - Calendario)
  // ==========================================
  mesSeleccionado: number = 6;
  anioSeleccionado: number = 2026;
  empleadoSeleccionado: string = '';
  empleadosCalendario: EmpleadoCalendario[] = [];
  asistenciaMensual: AsistenciaDia[] = [];
  diasCalendario: DiaCalendario[] = [];

  // --- VISTA GLOBAL MENSUAL ---
  globalMesSeleccionado: number = 6;
  globalAnioSeleccionado: number = 2026;
  globalDiasMes: number[] = [];
  globalEmpleados: any[] = [];
  globalAsistenciaMap: { [rut: string]: { [dia: number]: string } } = {};

  // Estado para la pestaña Vista Global de Turnos
  turnosMesSeleccionado: number = new Date().getMonth() + 1;
  turnosAnioSeleccionado: number = new Date().getFullYear();
  globalDiasTurnosMes: number[] = [];
  globalTurnosMap: { [rut: string]: { [dia: number]: string } } = {};
  
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

  get empleadosPaginados(): Empleado[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.filteredEmpleados.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginasEmpleados(): number {
    return Math.ceil(this.filteredEmpleados.length / this.itemsPorPagina) || 1;
  }

  get rangoMostradoEmpleados(): string {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina + 1;
    const fin = Math.min(this.paginaActual * this.itemsPorPagina, this.filteredEmpleados.length);
    return `${inicio}-${fin} de ${this.filteredEmpleados.length}`;
  }

  get asistenciaPaginada(): AsistenciaEmpleadoNuevo[] {
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
      colacion: [0, Validators.required],
      tipo_jornada: ['Ordinaria', Validators.required],
      horas_contrato: [44, [Validators.required, Validators.min(1)]],
      dias_asistencia_0: [true],
      dias_asistencia_1: [true],
      dias_asistencia_2: [true],
      dias_asistencia_3: [true],
      dias_asistencia_4: [true],
      dias_asistencia_5: [false],
      dias_asistencia_6: [false]
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
      recargo: [50, Validators.required],
      autorizadoPor: ['', Validators.required]
    });

    this.excepcionJornadaForm = this.fb.group({
      rutEmpleado: ['', Validators.required],
      fecha_libre: ['', Validators.required],
      fecha_trabaja: ['', Validators.required]
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
        if (['general', 'gestion', 'ficha', 'asistencia', 'horasExtra', 'turnos', 'global', 'calendario'].includes(tab)) {
          this.activeTab = tab as TabType;
          if (this.activeTab === 'asistencia') {
            this.verificarEstadoDia();
          }
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

  cargarHorasExtra() {
    this.rrhhService.obtenerHorasExtra(this.mesSeleccionado, this.anioSeleccionado).subscribe({
      next: (res: any) => {
        this.historialHorasExtra = (res.data || []).map((he: any) => {
          const emp = this.employees.find(e => e.rut === he.rut || e.rut === he.empleado_rut);
          return {
            id: he._id || he.id,
            fecha: he.fecha,
            empleadoId: emp?.id || '',
            empleado: emp?.nombre || he.rut,
            cargo: emp?.cargo || '',
            rut: he.rut || he.empleado_rut,
            sueldoBase: emp?.config_remuneracion?.sueldo_base || 0,
            tipoDia: he.tipo || 'laboral',
            horas: he.horas,
            recargo: he.recargo || 50,
            montoTotal: 0,
            autorizadoPor: he.autorizado_por || 'Registrado en RRHH'
          };
        });
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al obtener horas extras', err);
      }
    });
  }

  // ==========================================
  // LÓGICA NUEVA: CALENDARIO (Issue #21)
  // ==========================================

  obtenerAsistencia(): void {
    let url = `${environment.apiUrl}/asistencia/${this.mesSeleccionado}/${this.anioSeleccionado}/`;

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

    const empleadoData = this.employees.find(e => e.rut === this.empleadoSeleccionado);
    const estadoGlobal = empleadoData?.estado || '';
    const esGlobalLicencia = estadoGlobal === 'licencia';

    // Generar cada día del mes
    for (let i = 1; i <= diasEnMes; i++) {
      const fechaObj = new Date(this.anioSeleccionado, this.mesSeleccionado - 1, i);
      const esFinde = fechaObj.getDay() === 0 || fechaObj.getDay() === 6;

      let estadoFinal = 'Sin registro';

      // Prioridad 1: Dato duro diario (Base de datos)
      if (asistenciaMap[i] && asistenciaMap[i] !== 'Sin registro' && asistenciaMap[i] !== 'Finde') {
        estadoFinal = asistenciaMap[i]; 
      } 
      // Prioridad 2: Fallback al estado global (Licencia, etc) si el casillero está vacío
      else if (esGlobalLicencia) {
        estadoFinal = estadoGlobal;
      }
      // Prioridad 3: Lógica normal del calendario
      else if (esFinde) {
        estadoFinal = 'Finde';
      } 
      else if (esMesPasado || (esMesActual && i <= diaActual)) {
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

        this.filteredEmpleados = [...this.employees];

        // Restaurado: Mapear los empleados reales a la lista de asistencia diaria (Modo Zen)
        // Esto NO es un mock, es la lógica de negocio para tener a quién marcarle excepciones.
        this.asistenciaList = this.employees.map((emp: any) => ({
          id: emp.id,
          rut: emp.rut,
          nombre: emp.nombre,
          cargo: emp.cargo,
          estado: 'Sin Registro',
          entrada: '--:--',
          salida: '--:--',
          diasVacaciones: 0,
          inasistenciasInjustificadas: 0
        }));
        this.filteredAsistenciaList = [...this.asistenciaList];

        // Llamar a cargarHorasExtra AHORA que employees está poblado
        this.cargarHorasExtra();

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
        console.error('Error al conectar con la base de datos', error);
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



  getStatusColor(status: Empleado['estado']): string {
    const colors: Record<Empleado['estado'], string> = {
      'activo': 'status-active',
      'inactivo': 'status-inactive',
      'licencia': 'status-leave'
    };
    return colors[status] || 'status-inactive';
  }

  getStatusLabel(status: Empleado['estado']): string {
    const labels: Record<Empleado['estado'], string> = {
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
    // Sincronizar URL para que el Sidebar actualice su estado
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab },
      queryParamsHandling: 'merge'
    });

    this.activeTab = tab;
    this.paginaActual = 1;

    if (tab === 'asistencia') {
      this.verificarEstadoDia();
    } else if (tab === 'global') {
      this.cargarVistaGlobal();
    } else if (tab === 'turnos') {
      this.cargarVistaTurnos();
    }

    if (tab !== 'ficha') {
      this.selectedEmpleado = null;
    }
  }

  cargarVistaGlobal() {
    this.isLoading = true;
    
    // Obtener días del mes
    const daysInMonth = new Date(this.globalAnioSeleccionado, this.globalMesSeleccionado, 0).getDate();
    this.globalDiasMes = Array.from({length: daysInMonth}, (_, i) => i + 1);

    // Obtener empleados (usar caché si ya existen)
    const empleadosObs = this.globalEmpleados && this.globalEmpleados.length > 0 
      ? of({ data: this.globalEmpleados }) 
      : this.rrhhService.obtenerEmpleados(true);

    // Obtener asistencia
    const asistenciaObs = this.rrhhService.obtenerAsistencia(this.globalMesSeleccionado, this.globalAnioSeleccionado);

    forkJoin({
      resEmp: empleadosObs,
      resAsis: asistenciaObs
    }).subscribe({
      next: ({ resEmp, resAsis }) => {
        this.globalEmpleados = resEmp.data || resEmp;
        const asistencias = resAsis.data || [];
        
        // Mapear por RUT y Día
        this.globalAsistenciaMap = {};
        this.globalEmpleados.forEach(emp => {
          this.globalAsistenciaMap[emp.rut] = {};
        });

        asistencias.forEach((asis: any) => {
          if (asis.fecha) {
            const day = parseInt(asis.fecha.split('-')[2], 10);
            const empRut = asis.empleado_rut || asis.rut;
            if (!this.globalAsistenciaMap[empRut]) {
              this.globalAsistenciaMap[empRut] = {};
            }
            // Prevenir TypeError si asis.estado viene null/undefined
            this.globalAsistenciaMap[empRut][day] = (asis.estado || '').toLowerCase();
          }
        });

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar datos para vista global', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  cambiarMesGlobal(delta: number) {
    this.globalMesSeleccionado += delta;
    if (this.globalMesSeleccionado > 12) {
      this.globalMesSeleccionado = 1;
      this.globalAnioSeleccionado++;
    } else if (this.globalMesSeleccionado < 1) {
      this.globalMesSeleccionado = 12;
      this.globalAnioSeleccionado--;
    }
    this.cargarVistaGlobal();
  }

  // ==========================================
  // VISTA GLOBAL DE TURNOS (FASE 5)
  // ==========================================
  cargarVistaTurnos() {
    this.isLoading = true;
    const daysInMonth = new Date(this.turnosAnioSeleccionado, this.turnosMesSeleccionado, 0).getDate();
    this.globalDiasTurnosMes = Array.from({length: daysInMonth}, (_, i) => i + 1);

    const obs = this.globalEmpleados && this.globalEmpleados.length > 0
      ? of({ data: this.globalEmpleados })
      : this.rrhhService.obtenerEmpleados(true);

    obs.subscribe({
      next: (res: any) => {
        this.globalEmpleados = res.data || res;
        this.globalTurnosMap = {};

        this.globalEmpleados.forEach((emp: any) => {
          this.globalTurnosMap[emp.rut] = {};
          
          // Días de contrato normales (0=Lunes, 6=Domingo en nuestra interfaz)
          const diasAsistencia = emp.config_jornada?.dias_asistencia || [0,1,2,3,4];
          
          // Iterar por cada día del mes
          for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(this.turnosAnioSeleccionado, this.turnosMesSeleccionado - 1, day);
            const jsDay = dateObj.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
            const mappedDay = jsDay === 0 ? 6 : jsDay - 1; // Convertir a 0=Mon, ..., 6=Sun
            
            // Estado base por contrato
            let estadoTurno = diasAsistencia.includes(mappedDay) ? 'T' : 'L';

            // Revisar excepciones/swaps
            if (emp.excepciones_jornada && emp.excepciones_jornada.length > 0) {
              const dateStr = `${this.turnosAnioSeleccionado}-${String(this.turnosMesSeleccionado).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const excepcion = emp.excepciones_jornada.find((ex: any) => ex.fecha === dateStr || ex.fecha.startsWith(dateStr));
              
              if (excepcion) {
                if (excepcion.accion === 'agregar') {
                  estadoTurno = 'C-T'; // Cambio a Turno (Era libre, ahora trabaja)
                } else if (excepcion.accion === 'quitar') {
                  estadoTurno = 'C-L'; // Cambio a Libre (Era trabajo, ahora libre)
                }
              }
            }

            this.globalTurnosMap[emp.rut][day] = estadoTurno;
          }
        });

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar turnos globales', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  cambiarMesTurnos(delta: number) {
    this.turnosMesSeleccionado += delta;
    if (this.turnosMesSeleccionado > 12) {
      this.turnosMesSeleccionado = 1;
      this.turnosAnioSeleccionado++;
    } else if (this.turnosMesSeleccionado < 1) {
      this.turnosMesSeleccionado = 12;
      this.turnosAnioSeleccionado--;
    }
    this.cargarVistaTurnos();
  }

  viewFicha(employee: Empleado) {
    this.selectedEmpleado = employee;
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
      fechaIngreso: new Date().toISOString().split('T')[0],
      tipo_jornada: 'Ordinaria',
      horas_contrato: 44,
      dias_asistencia_0: true,
      dias_asistencia_1: true,
      dias_asistencia_2: true,
      dias_asistencia_3: true,
      dias_asistencia_4: true,
      dias_asistencia_5: false,
      dias_asistencia_6: false
    });
    this.viewingForm = true;
  }

  openEditModal(employee: Empleado) {
    this.isEditing = true;
    this.selectedEmpleado = employee;
    this.employeeForm.patchValue({
      ...employee,
      fechaIngreso: employee.fechaIngreso.toISOString().split('T')[0],
      sueldo_base: employee.config_remuneracion?.sueldo_base || 0,
      afp: employee.config_remuneracion?.afp || '',
      salud: employee.config_remuneracion?.salud || '',
      movilizacion: employee.config_remuneracion?.movilizacion || 0,
      colacion: employee.config_remuneracion?.colacion || 0,
      tipo_jornada: employee.config_jornada?.tipo_jornada || 'Ordinaria',
      horas_contrato: employee.config_jornada?.horas_contrato || 44,
      dias_asistencia_0: (employee.config_jornada?.dias_asistencia || [0,1,2,3,4]).includes(0),
      dias_asistencia_1: (employee.config_jornada?.dias_asistencia || [0,1,2,3,4]).includes(1),
      dias_asistencia_2: (employee.config_jornada?.dias_asistencia || [0,1,2,3,4]).includes(2),
      dias_asistencia_3: (employee.config_jornada?.dias_asistencia || [0,1,2,3,4]).includes(3),
      dias_asistencia_4: (employee.config_jornada?.dias_asistencia || [0,1,2,3,4]).includes(4),
      dias_asistencia_5: (employee.config_jornada?.dias_asistencia || [0,1,2,3,4]).includes(5),
      dias_asistencia_6: (employee.config_jornada?.dias_asistencia || [0,1,2,3,4]).includes(6)
    });
    this.viewingForm = true;
  }

  closeForm() {
    this.viewingForm = false;
  }

  saveEmpleado() {
    if (this.employeeForm.invalid) {
      Object.keys(this.employeeForm.controls).forEach(key => {
        const control = this.employeeForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isSaving = true;
    const rawData = this.employeeForm.getRawValue();

    const dias_asistencia: number[] = [];
    if (rawData.dias_asistencia_0) dias_asistencia.push(0);
    if (rawData.dias_asistencia_1) dias_asistencia.push(1);
    if (rawData.dias_asistencia_2) dias_asistencia.push(2);
    if (rawData.dias_asistencia_3) dias_asistencia.push(3);
    if (rawData.dias_asistencia_4) dias_asistencia.push(4);
    if (rawData.dias_asistencia_5) dias_asistencia.push(5);
    if (rawData.dias_asistencia_6) dias_asistencia.push(6);

    const empleadoData: any = {
      ...rawData,
      nombre_completo: rawData.nombre,
      fecha_ingreso: rawData.fechaIngreso,
      config_remuneracion: {
        sueldo_base: rawData.sueldo_base,
        afp: rawData.afp,
        salud: rawData.salud,
        movilizacion: rawData.movilizacion,
        colacion: rawData.colacion
      },
      config_jornada: {
        tipo_jornada: rawData.tipo_jornada,
        horas_contrato: rawData.horas_contrato,
        dias_asistencia: dias_asistencia
      }
    };

    delete empleadoData.sueldo_base;
    delete empleadoData.afp;
    delete empleadoData.salud;
    delete empleadoData.movilizacion;
    delete empleadoData.colacion;
    delete empleadoData.tipo_jornada;
    delete empleadoData.horas_contrato;
    for (let i = 0; i <= 6; i++) delete empleadoData[`dias_asistencia_${i}`];

    if (this.isEditing && this.selectedEmpleado) {
      this.rrhhService.actualizarEmpleado(this.selectedEmpleado.rut, empleadoData).subscribe({
        next: (res: any) => {
          this.isSaving = false;
          this.closeForm();
          this.cargarDatosEmpleados();
        },
        error: (err: any) => {
          this.isSaving = false;
          const msg = err.error?.error || 'Error al actualizar empleado';
          console.log('Error manejado globalmente');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.rrhhService.crearEmpleado(empleadoData).subscribe({
        next: (res: any) => {
          this.isSaving = false;
          this.isSaving = false;
          this.closeForm();
          this.cargarDatosEmpleados();
        },
        error: (err: any) => {
          this.isSaving = false;
          const msg = err.error?.error || 'Error al registrar empleado';
          console.log('Error manejado globalmente');
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteEmpleado(rut: string) {
    if (confirm('¿Está seguro de dar de baja este empleado?')) {
      this.rrhhService.darDeBajaEmpleado(rut).subscribe({
        next: () => {
          console.log('Empleado dado de baja exitosamente.');
          this.cargarDatosEmpleados();
        },
        error: (err: any) => {
          const msg = err.error?.error || 'Error al dar de baja empleado';
          console.log('Error manejado globalmente');
        }
      });
    }
  }

  onSearchEmpleado(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredEmpleados = this.employees.filter(e =>
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

  verificarEstadoDia() {
    this.verificandoDia = true;
    this.rrhhService.verificarEstadoDia().subscribe({
      next: (res: any) => {
        this.diaSellado = res.dia_sellado;
        this.esFindeHoy = res.es_finde || false;
        this.verificandoDia = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al verificar estado del día', err);
        this.verificandoDia = false;
        this.cdr.detectChanges();
      }
    });
  }

  sellarDia() {
    if (confirm('¿Está seguro de sellar el día? Esto marcará como Presente a todos los empleados activos sin registro de hoy. Esta acción es definitiva.')) {
      this.isSelleandoDia = true;
      this.rrhhService.sellarAsistenciaDia().subscribe({
        next: (res: any) => {
          this.isSelleandoDia = false;
          this.diaSellado = true;
          this.toastService.show(`Día sellado exitosamente. Se marcaron ${res.insertados} presentes.`, 'success');
          // Update the local list so the UI reflects "Presente" on the sealed people
          this.asistenciaList.forEach(emp => {
            if (emp.estado === 'Sin registro' || emp.estado === 'Presente') {
              emp.estado = 'Presente';
            }
          });
          this.filteredAsistenciaList = [...this.asistenciaList];
          // Refresh monthly calendar data if needed
          this.obtenerAsistencia();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.isSelleandoDia = false;
          const msg = err.error?.message || 'Error al sellar el día';
          this.toastService.show(msg, 'error');
          this.cdr.detectChanges();
        }
      });
    }
  }

  registrarHorasExtra() {
    if (this.horasExtraForm.invalid) return;

    this.isSaving = true;
    const data = this.horasExtraForm.value;
    const empleado = this.employees.find(e => e.id == data.empleadoId);

    if (!empleado) {
      this.isSaving = false;
      return;
    }

    const payload = {
      rut: empleado.rut,
      empleado_rut: empleado.rut,
      horas: data.horas,
      fecha: data.fecha,
      tipo: data.recargo == 100 ? 'festivo' : 'laboral',
      recargo: parseInt(data.recargo, 10),
      autorizado_por: data.autorizadoPor
    };

    this.rrhhService.registrarHorasExtra(payload).subscribe({
      next: (res: any) => {
        // En base a la respuesta, insertamos en el arreglo local
        const savedData = res.data ? res.data[0] : payload;
        this.historialHorasExtra.unshift({
          id: savedData._id || savedData.id || Date.now(),
          fecha: savedData.fecha || data.fecha,
          empleadoId: empleado.id,
          empleado: empleado.nombre,
          cargo: empleado.cargo,
          rut: empleado.rut,
          sueldoBase: empleado.config_remuneracion.sueldo_base,
          tipoDia: data.recargo == 100 ? 'festivo' : 'laboral',
          horas: data.horas,
          recargo: parseInt(data.recargo, 10),
          montoTotal: 0,
          autorizadoPor: data.autorizadoPor
        });

        console.log(`Se han registrado ${data.horas} hrs para ${empleado.nombre}`);

        this.horasExtraForm.reset({
          fecha: new Date().toISOString().split('T')[0],
          horas: 1,
          recargo: 50
        });
        
        this.isSaving = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err.error?.message || 'Error al conectar con la base de datos para Horas Extras';
        console.log('Error de hrs extras', msg);
        this.cdr.detectChanges();
      }
    });
  }

  eliminarRegistroHE(id: string | number) {
    this.historialHorasExtra = this.historialHorasExtra.filter(h => h.id !== id);
    console.log('Registro eliminado');
  }

  openExcepcionModal(empleado: AsistenciaEmpleadoNuevo) {
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
          console.log('Atraso registrado');
        } else if (tipo === 'vacaciones') {
          emp.diasVacaciones = Math.max(0, emp.diasVacaciones - 1);
          console.log('Vacaciones registradas');
        } else {
          emp.inasistenciasInjustificadas += 1;
          console.log('Excepción registrada');
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
        console.log('Error guardando excepción', msg);
        this.cdr.detectChanges();
      }
    });
  }

  // --- MODO ZEN PREDICTIVO: Excepciones Pre-aprobadas ---
  showExcepcionJornadaModal() {
    this.excepcionJornadaForm.reset({
      rutEmpleado: this.selectedEmpleado ? this.selectedEmpleado.rut : '',
      fecha_libre: '',
      fecha_trabaja: ''
    });
    this.isSaving = false;
    // Usamos una variable separada para mostrar el modal de turnos independientemente del selectedEmpleado
    this._showExcepcionJornadaModal = true;
  }

  closeExcepcionJornadaModal() {
    this._showExcepcionJornadaModal = false;
  }

  saveExcepcionJornada() {
    if (this.excepcionJornadaForm.invalid) return;
    this.isSaving = true;

    const val = this.excepcionJornadaForm.value;

    this.rrhhService.swapTurno(val.rutEmpleado, val.fecha_libre, val.fecha_trabaja).subscribe({
      next: (res) => {
        // Actualizamos localmente si estamos en la ficha de ese empleado
        const empleadoActualizado = res.data[0];
        if (this.selectedEmpleado && this.selectedEmpleado.rut === val.rutEmpleado) {
           this.selectedEmpleado.excepciones_jornada = empleadoActualizado.excepciones_jornada;
        }
        
        this.isSaving = false;
        this.closeExcepcionJornadaModal();
        this.toastService.show('Swap realizado exitosamente.', 'success');
        
        this.cargarDatosEmpleados();
        if (this.activeTab === 'turnos') {
          this.cargarVistaTurnos(); // refrescar la matriz
        }
      },
      error: (err) => {
        this.toastService.show('Error al registrar swap.', 'error');
        this.isSaving = false;
      }
    });
  }
}
