
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute } from '@angular/router';
import { jsPDF } from 'jspdf';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core'; // FIX: NgZone eliminado
import { Title } from '@angular/platform-browser';



interface Payroll {
  id: string;
  rut: string;
  nombre: string;
  cargo: string;
  sueldoBase: number;
  gratificacion: number;
  movilizacion: number;
  colacion: number;
  totalHaberes: number;
  afp: number;
  salud: number;
  seguroCesantia: number;
  totalDescuentos: number;
  neto: number;
  mes: number;
  anio: number;
  horasExtra: number;
  estadoPago: string;
  motivoImpago?: string;
  descuentoAsistencia: number;
  diasAusentes: number; // AJUSTE #25: días ausentes para bloque separado
  afpNombre: string;   // Nombre real de la AFP del empleado
  saludNombre: string; // Nombre real de la institución de salud
  tipoContrato: string; // Tipo de contrato real del empleado
  impPrevSalud: number;  // Base imponible prev/salud desde backend
  impCesantia: number;   // Base imponible cesantía desde backend
  baseTributable: number; // Base tributable desde backend
  estadoEmpleado: string;  // Estado del empleado desde backend
  periodoTexto: string;    // Período formateado desde backend
  diasTrabajados: number;  // Días trabajados calculados en backend
  selected?: boolean;      // Para checkbox
}

interface HorasExtraRecord {
  id: string;
  rut: string;
  empleado: string;
  sueldoBase: number;
  horas: number;
  recargo: number;
  montoTotal: number;
  fecha: Date;
  tipo: 'laboral' | 'finde' | 'festivo';
  tipoDia: 'laboral' | 'finde' | 'festivo';
  autorizadoPor: string;
  mes: number;
  anio: number;
}

@Component({
  selector: 'app-remuneraciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './remuneraciones.component.html',
  styleUrls: ['./remuneraciones.component.css']
})
export class RemuneracionesComponent implements OnInit {
  mostrarModal = false;
  showModalImpago = false;
  motivoImpago = '';
  filtroEstado = 'Todos';
  filtroTexto = '';
  detalleSeleccionado: Payroll | null = null;

  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef); // FIX: NgZone eliminado
  private titleService = inject(Title);

  isLoading = true;
  isFetching = false;
  isGenerating = false;
  isFormalizing = false; // Estado para el botón de formalizar
  isLoadingData = false;
  liquidacionesActivo = false;
  paginaActual = 1;
  activeTab: 'nomina' | 'horasExtra' = 'nomina';
  mesSeleccionado: number = 5;
  anioSeleccionado: number = 2026;
  itemsPorPagina: number = 10;
  opcionesPorPagina: number[] = [10, 20, 50, 100];

  meses: any[] = [
    { value: 1, nombre: 'Enero' }, { value: 2, nombre: 'Febrero' },
    { value: 3, nombre: 'Marzo' }, { value: 4, nombre: 'Abril' },
    { value: 5, nombre: 'Mayo' }, { value: 6, nombre: 'Junio' },
    { value: 7, nombre: 'Julio' }, { value: 8, nombre: 'Agosto' },
    { value: 9, nombre: 'Septiembre' }, { value: 10, nombre: 'Octubre' },
    { value: 11, nombre: 'Noviembre' }, { value: 12, nombre: 'Diciembre' }
  ];

  anios: number[] = [2025, 2026, 2027];
  horasExtraForm: FormGroup;
  historialHorasExtra: HorasExtraRecord[] = [];
  payrollData: Payroll[] = [];
  filteredPayrollData: Payroll[] = [];

  get todosSeleccionados(): boolean {
    return this.filteredPayrollData.length > 0 && this.filteredPayrollData.every(p => p.selected);
  }

  get cantidadSeleccionados(): number {
    return this.filteredPayrollData.filter(p => p.selected).length;
  }

  constructor(private http: HttpClient) {
    this.horasExtraForm = this.fb.group({
      empleadoId: ['', Validators.required],
      horas: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      recargo: [50, Validators.required]
    });
  }

  cargarRemuneraciones() {
    const token = localStorage.getItem('erp_token');
    if (!token) {
      setTimeout(() => this.toastService.show('Sesión expirada.', 'warning'), 0);
      return;
    }

    setTimeout(() => {
      this.isLoading = true;
      this.isLoadingData = true;
      this.cdr.detectChanges();
    }, 0);

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any>(
      `http://54.87.191.204:8000/api/remuneraciones/${this.mesSeleccionado}/${this.anioSeleccionado}/`,
      { headers }
    ).subscribe({
      next: (response) => {
        this.payrollData = response.data;
        this.filteredPayrollData = response.data;
        
        // Seleccionar automáticamente los que están Pendientes
        this.filteredPayrollData.forEach(p => {
          if (p.estadoPago === 'Pendiente') {
            p.selected = true;
          } else {
            p.selected = false;
          }
        });

        this.http.get<any>(
          `http://54.87.191.204:8000/api/horas-extra/${this.mesSeleccionado}/${this.anioSeleccionado}/`,
          { headers }
        ).subscribe({
          next: (heResponse) => {
            this.historialHorasExtra = (heResponse.data || []).map((he: any) => {
              const empleadoEnNomina = this.payrollData.find(p => p.rut === he.rut || p.rut === he.empleado_rut);
              const nombre = empleadoEnNomina?.nombre ?? he.nombre_empleado ?? (he.rut || he.empleado_rut);
              const sueldoBase = empleadoEnNomina?.sueldoBase ?? he.sueldo_base ?? 0;
              
              return {
                id: he._id || he.id,
                rut: he.rut || he.empleado_rut,
                empleado: nombre,
                sueldoBase: sueldoBase,
                horas: he.horas,
                recargo: he.recargo || 50,
                montoTotal: Math.round((sueldoBase / 160) * (1 + ((he.recargo || 50) / 100)) * he.horas),
                fecha: he.fecha ? new Date(he.fecha) : new Date(),
                tipo: he.tipo ?? 'laboral',
                tipoDia: he.tipo ?? 'laboral',
                autorizadoPor: 'Registrado en RRHH',
                mes: he.mes,
                anio: he.anio
              } as HorasExtraRecord;
            });
            setTimeout(() => {
              this.isLoading = false;
              this.isLoadingData = false;
              this.cdr.detectChanges();
            }, 0);
          },
          error: () => {
            this.historialHorasExtra = [];
            setTimeout(() => {
              this.isLoading = false;
              this.isLoadingData = false;
              this.cdr.detectChanges();
            }, 0);
          }
        });
      },
      error: (error) => {
        console.error('Error al obtener remuneraciones', error);
        setTimeout(() => {
          const mensaje = error?.error?.message || 'Error al cargar remuneraciones.';
          this.toastService.show(mensaje, 'warning');
          this.isLoading = false;
          this.isLoadingData = false;
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  ngOnInit() {
    this.titleService.setTitle('Remuneraciones');
    this.cargarRemuneraciones();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const tab = params['tab'];
        if (['nomina', 'horasExtra'].includes(tab)) {
          this.activeTab = tab as any;
        }
      }
    });
  }

  changeTab(tab: 'nomina' | 'horasExtra') {
    this.activeTab = tab;
    this.liquidacionesActivo = false;
    this.paginaActual = 1;
  }

  calcularHoraNormal(sueldoBase: number): number {
    return (sueldoBase / 30) * 28 / 42;
  }

  calcularHorasExtra() {
    if (this.horasExtraForm.invalid) return;
    const formValues = this.horasExtraForm.value;
    const empleado = this.payrollData.find(p => p.id === String(formValues.empleadoId));
    if (!empleado) return;

    const valorHoraNormal = this.calcularHoraNormal(empleado.sueldoBase);
    const recargoMultiplicador = 1 + (formValues.recargo / 100);
    const montoTotal = valorHoraNormal * recargoMultiplicador * formValues.horas;

    const token = localStorage.getItem('erp_token');
    if (!token) {
      this.toastService.show('Sesión expirada.', 'warning');
      return;
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    const payload = {
      rut: empleado.rut,
      empleado_rut: empleado.rut,
      horas: formValues.horas,
      fecha: new Date().toISOString().split('T')[0],
      mes: this.mesSeleccionado,
      anio: this.anioSeleccionado,
      tipo: formValues.recargo == 100 ? 'festivo' : 'laboral',
      recargo: parseInt(formValues.recargo, 10)
    };

    this.http.post<any>('http://54.87.191.204:8000/api/horas-extra/', payload, { headers }).subscribe({
      next: (res: any) => {
        const savedData = res.data ? res.data[0] : payload;
        const nuevoRegistro: HorasExtraRecord = {
          id: savedData._id || savedData.id || crypto.randomUUID(),
          rut: empleado.rut,
          empleado: empleado.nombre,
          sueldoBase: empleado.sueldoBase,
          horas: formValues.horas,
          recargo: formValues.recargo,
          montoTotal: Math.round(montoTotal),
          fecha: new Date(),
          tipo: 'laboral',
          tipoDia: 'laboral',
          autorizadoPor: 'Registrado en Remuneraciones',
          mes: this.mesSeleccionado,
          anio: this.anioSeleccionado
        };

        this.historialHorasExtra.unshift(nuevoRegistro);
        console.log('Horas registradas');
        this.horasExtraForm.patchValue({ horas: 1 });
      },
      error: (err: any) => {
        const msg = err.error?.message || 'Error al conectar con la base de datos para Horas Extras';
        console.log('Error manejado globalmente');
      }
    });
  }

  eliminarRegistro(id: string) {
    // Para cumplir con el requerimiento de quitar el borrado fantasma:
    // Puesto que el endpoint DELETE de la API no está desarrollado aún, emitimos un error o advertencia,
    // pero evitamos modificar el arreglo local si no sabemos que backend lo hizo.
    this.toastService.show('La eliminación de Horas Extras en Base de Datos no está implementada en esta API aún.', 'warning');
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('es-CL');
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', minimumFractionDigits: 0
    }).format(value);
  }

  getTotalSueldo(): number {
    return this.filteredPayrollData.reduce((sum, p) => sum + p.totalHaberes, 0);
  }

  getTotalNeto(): number {
    return this.filteredPayrollData.reduce((sum, p) => sum + p.neto, 0);
  }

  onSearch(event?: Event) {
    if (event) {
      this.filtroTexto = (event.target as HTMLInputElement).value.toLowerCase();
    }
    
    this.filteredPayrollData = this.payrollData.filter(item => {
      const matchTexto = item.nombre.toLowerCase().includes(this.filtroTexto) ||
                         item.rut.toLowerCase().includes(this.filtroTexto) ||
                         item.cargo.toLowerCase().includes(this.filtroTexto);
      
      const matchEstado = this.filtroEstado === 'Todos' || item.estadoPago === this.filtroEstado;
      
      return matchTexto && matchEstado;
    });
    this.paginaActual = 1;
  }

  getTotalHorasMes(): number {
    return this.historialHorasExtra.reduce((sum, h) => sum + h.horas, 0);
  }

  getTotalHorasExtraMes(): number {
    return this.historialHorasExtra.reduce((sum, h) => sum + h.montoTotal, 0);
  }

  get totalPaginasNomina(): number {
    return Math.ceil(this.filteredPayrollData.length / this.itemsPorPagina) || 1;
  }

  get nominaPaginada(): Payroll[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.filteredPayrollData.slice(inicio, inicio + this.itemsPorPagina);
  }

  get rangoMostradoNomina(): string {
    const total = this.filteredPayrollData.length;
    if (total === 0) return '0';
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina + 1;
    const fin = Math.min(this.paginaActual * this.itemsPorPagina, total);
    return `${inicio} - ${fin} de ${total}`;
  }

  get totalPaginasHorasExtra(): number {
    return Math.ceil(this.historialHorasExtra.length / this.itemsPorPagina) || 1;
  }

  get horasExtraPaginadas(): HorasExtraRecord[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.historialHorasExtra.slice(inicio, inicio + this.itemsPorPagina);
  }

  get rangoMostradoHorasExtra(): string {
    const total = this.historialHorasExtra.length;
    if (total === 0) return '0';
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina + 1;
    const fin = Math.min(this.paginaActual * this.itemsPorPagina, total);
    return `${inicio} - ${fin} de ${total}`;
  }

  cambiarItemsPorPagina(event: Event) {
    this.itemsPorPagina = Number((event.target as HTMLSelectElement).value);
    this.paginaActual = 1;
  }

  paginaAnterior() {
    if (this.paginaActual > 1) this.paginaActual--;
  }

  siguientePaginaActiva() {
    const totalPaginas = this.activeTab === 'nomina' ? this.totalPaginasNomina : this.totalPaginasHorasExtra;
    if (this.paginaActual < totalPaginas) this.paginaActual++;
  }

  descargarPDF(payroll: Payroll) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const nombreMes = this.meses.find(m => m.value === payroll.mes)?.nombre ?? payroll.mes;
    const fechaEmision = new Date().toLocaleDateString('es-CL');
    const pageW = 210;
    const margen = 20;
    const colDer = pageW / 2 + 5;
    const anchoCol = (pageW - margen * 2 - 5) / 2;

    // Colores corporativos
    const azulPrim: [number, number, number] = [31, 45, 74];
    const azulSec: [number, number, number] = [42, 59, 87];
    const blanco: [number, number, number] = [255, 255, 255];
    const gris1: [number, number, number] = [51, 51, 51];
    const gris2: [number, number, number] = [102, 102, 102];
    const borde: [number, number, number] = [230, 230, 230];
    const fondoTotal: [number, number, number] = [243, 244, 246];

    let y = margen;

    // ── ENCABEZADO ─────────────────────────────────────────────
    doc.setFillColor(...azulPrim);
    doc.rect(0, 0, pageW, 28, 'F');

    doc.setTextColor(...blanco);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('LIQUIDACIÓN DE SUELDO', margen, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ERP Liceos EMTP', pageW - margen, 10, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Período:  ${nombreMes} ${payroll.anio}`, pageW - margen, 17, { align: 'right' });
    doc.text(`Emisión:  ${fechaEmision}`, pageW - margen, 23, { align: 'right' });

    y = 36;

    // Línea separadora
    doc.setDrawColor(...borde);
    doc.setLineWidth(0.3);
    doc.line(margen, y, pageW - margen, y);
    y += 6;

    // ── DATOS DEL TRABAJADOR ───────────────────────────────────
    // Encabezado sección
    doc.setFillColor(...azulPrim);
    doc.rect(margen, y, pageW - margen * 2, 7, 'F');
    doc.setTextColor(...blanco);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('DATOS DEL TRABAJADOR', margen + 3, y + 5);
    y += 10;

    // Borde tarjeta
    doc.setDrawColor(...borde);
    doc.setLineWidth(0.3);
    const datosH = 54; // Aumentado para acomodar Período y Estado
    doc.rect(margen, y, pageW - margen * 2, datosH, 'S');

    // Datos columna izquierda
    const labelX = margen + 4;
    const valX = margen + 38;
    const labelX2 = pageW / 2 + 4;
    const valX2 = pageW / 2 + 38;

    doc.setTextColor(...gris2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const filasDatos = [
      ['Nombre', payroll.nombre],
      ['RUT', payroll.rut],
      ['Cargo', payroll.cargo],
      ['Tipo de Contrato', payroll.tipoContrato],
      ['Previsión (AFP)', payroll.afpNombre],
    ];
    const filasDer = [
      ['Salud', payroll.saludNombre],
      ['Días Trabajados', `${payroll.diasTrabajados} días`],
      ['Horas Extras', payroll.horasExtra > 0 ? `${(payroll.horasExtra / (payroll.sueldoBase / 160 * 1.5)).toFixed(1)} hrs` : '—'],
      ['Período', payroll.periodoTexto],
      ['Estado', payroll.estadoEmpleado],
    ];

    filasDatos.forEach((fila, i) => {
      const fy = y + 5 + i * 7;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...gris2);
      doc.text(fila[0], labelX, fy);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...gris1);
      doc.text(fila[1], valX, fy);
    });

    filasDer.forEach((fila, i) => {
      const fy = y + 5 + i * 7;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...gris2);
      doc.text(fila[0], labelX2, fy);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...gris1);
      doc.text(fila[1], valX2, fy);
    });

    // línea divisoria vertical
    doc.setDrawColor(...borde);
    doc.line(pageW / 2, y, pageW / 2, y + datosH);
    y += datosH + 8;

    // ── HELPER: tabla simple ───────────────────────────────────
    const drawTable = (startY: number, titulo: string, filas: [string, string][], totalLabel: string, totalVal: string, startX: number, ancho: number): number => {
      let ty = startY;
      // Header
      doc.setFillColor(...azulPrim);
      doc.rect(startX, ty, ancho, 7, 'F');
      doc.setTextColor(...blanco);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(titulo, startX + 3, ty + 5);
      doc.text('MONTO', startX + ancho - 3, ty + 5, { align: 'right' });
      ty += 7;

      // Filas
      filas.forEach((fila, i) => {
        if (i % 2 === 1) {
          doc.setFillColor(249, 250, 251);
          doc.rect(startX, ty, ancho, 7, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...gris1);
        doc.text(fila[0], startX + 3, ty + 5);
        doc.text(fila[1], startX + ancho - 3, ty + 5, { align: 'right' });
        ty += 7;
      });

      // Fila total (solo si tiene contenido)
      if (totalLabel) {
        doc.setFillColor(...fondoTotal);
        doc.rect(startX, ty, ancho, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...azulPrim);
        doc.text(totalLabel, startX + 3, ty + 5);
        doc.text(totalVal, startX + ancho - 3, ty + 5, { align: 'right' });
        ty += 7;
      }

      // Borde tabla
      doc.setDrawColor(...borde);
      doc.setLineWidth(0.3);
      doc.rect(startX, startY, ancho, ty - startY, 'S');

      return ty;
    };

    // ── HABERES IMPONIBLES + DESCUENTOS LEGALES (fila 1) ──────
    const filasHabImponibles: [string, string][] = [
      ['Sueldo Base', this.formatCurrency(payroll.sueldoBase)],
      ['Gratificación Legal', this.formatCurrency(payroll.gratificacion)],
    ];
    if (payroll.horasExtra > 0) {
      filasHabImponibles.push(['Horas Extras', this.formatCurrency(payroll.horasExtra)]);
    }

    const totalImponible = payroll.sueldoBase + payroll.gratificacion + payroll.horasExtra;

    const filasDescuentos: [string, string][] = [
      [`AFP (${payroll.afpNombre})`, `-${this.formatCurrency(payroll.afp)}`],
      [`Salud (${payroll.saludNombre})`, `-${this.formatCurrency(payroll.salud)}`],
      ['Seguro Cesantía', `-${this.formatCurrency(payroll.seguroCesantia)}`],
    ];

    const y1izq = drawTable(y, 'HABERES IMPONIBLES', filasHabImponibles, 'TOTAL HABERES IMPONIBLES', this.formatCurrency(totalImponible), margen, anchoCol);
    const y1der = drawTable(y, 'DESCUENTOS LEGALES', filasDescuentos, 'TOTAL DESCUENTOS LEGALES', `-${this.formatCurrency(payroll.totalDescuentos)}`, colDer, anchoCol);

    y = Math.max(y1izq, y1der) + 6;

    // ── HABERES NO IMPONIBLES + AJUSTES ASISTENCIA (fila 2) ───
    const filasNoImponibles: [string, string][] = [
      ['Movilización', this.formatCurrency(payroll.movilizacion)],
      ['Colación', this.formatCurrency(payroll.colacion)],
    ];
    const totalNoImponible = payroll.movilizacion + payroll.colacion;

    const y2izq = drawTable(y, 'HABERES NO IMPONIBLES', filasNoImponibles, 'TOTAL HABERES NO IMPONIBLES', this.formatCurrency(totalNoImponible), margen, anchoCol);

    // Ajustes por asistencia (solo si hay ausencias)
    let y2der = y;
    if (payroll.descuentoAsistencia > 0) {
      const filasAsistencia: [string, string][] = [
        ['Días Ausentes', `${payroll.diasAusentes} día(s)`],
        ['Rebaja Aplicada al Imponible', `-${this.formatCurrency(payroll.descuentoAsistencia)}`],
      ];
      y2der = drawTable(y, 'AJUSTES POR ASISTENCIA', filasAsistencia, '', '', colDer, anchoCol);
      // Nota informativa
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...gris2);
      doc.text('* Informativo. La rebaja ya fue aplicada al imponible.', colDer + 2, y2der + 3);
      y2der += 6;
    }

    y = Math.max(y2izq, y2der) + 6;

    // ── TOTALES GENERALES ─────────────────────────────────────
    const totalesH = 18;
    doc.setFillColor(...fondoTotal);
    doc.setDrawColor(...borde);
    doc.rect(margen, y, pageW - margen * 2, totalesH, 'FD');

    // línea vertical divisoria
    doc.line(pageW / 2, y, pageW / 2, y + totalesH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...gris2);
    doc.text('TOTAL HABERES', pageW / 4 + margen / 2, y + 6, { align: 'center' });
    doc.setFontSize(13);
    doc.setTextColor(...azulPrim);
    doc.text(this.formatCurrency(payroll.totalHaberes), pageW / 4 + margen / 2, y + 14, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...gris2);
    doc.text('TOTAL DESCUENTOS', pageW * 3 / 4 - margen / 2, y + 6, { align: 'center' });
    doc.setFontSize(13);
    doc.setTextColor(185, 28, 28);
    doc.text(`-${this.formatCurrency(payroll.totalDescuentos)}`, pageW * 3 / 4 - margen / 2, y + 14, { align: 'center' });

    y += totalesH + 6;

    // ── LÍQUIDO A RECIBIR ─────────────────────────────────────
    doc.setFillColor(...azulPrim);
    doc.rect(margen, y, pageW - margen * 2, 16, 'F');
    doc.setTextColor(...blanco);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('LÍQUIDO A RECIBIR', margen + 6, y + 10);
    doc.setFontSize(16);
    doc.text(this.formatCurrency(payroll.neto), pageW - margen - 4, y + 10, { align: 'right' });

    y += 22;

    // ── RESUMEN IMPOSITIVO ────────────────────────────────────
    const resumenH = 18;
    doc.setFillColor(...fondoTotal);
    doc.setDrawColor(...borde);
    doc.rect(margen, y, pageW - margen * 2, resumenH, 'FD');

    const col3W = (pageW - margen * 2) / 3;
    doc.line(margen + col3W, y, margen + col3W, y + resumenH);
    doc.line(margen + col3W * 2, y, margen + col3W * 2, y + resumenH);

    const resumenItems = [
      ['IMP. PREV./SALUD', this.formatCurrency(payroll.impPrevSalud)],
      ['IMP. CESANTÍA', this.formatCurrency(payroll.impCesantia)],
      ['BASE TRIBUTABLE', this.formatCurrency(payroll.baseTributable)],
    ];

    resumenItems.forEach((item, i) => {
      const cx = margen + col3W * i + col3W / 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...gris2);
      doc.text(item[0], cx, y + 6, { align: 'center' });
      doc.setFontSize(11);
      doc.setTextColor(...azulPrim);
      doc.text(item[1], cx, y + 14, { align: 'center' });
    });

    y += resumenH + 8;

    // ── PIE DE PÁGINA ─────────────────────────────────────────
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gris2);
    const textoCert = 'Certifico que he recibido de ERP Liceos EMTP el saldo indicado en la presente Liquidación y no tengo cargo ni cobro posterior que hacer.';
    const lineas = doc.splitTextToSize(textoCert, pageW - margen * 2);
    doc.text(lineas, pageW / 2, y, { align: 'center' });

    y += lineas.length * 4 + 10;

    // Líneas de firma
    doc.setDrawColor(...borde);
    doc.setLineWidth(0.4);
    doc.line(margen + 10, y, margen + 65, y);
    doc.line(pageW - margen - 65, y, pageW - margen - 10, y);

    doc.setFontSize(8);
    doc.setTextColor(...gris2);
    doc.text('Firma Empleador', margen + 37, y + 5, { align: 'center' });
    doc.text('Firma Trabajador', pageW - margen - 37, y + 5, { align: 'center' });

    doc.save(`liquidacion_${payroll.rut}_${nombreMes}_${payroll.anio}.pdf`);
    this.toastService.show(`Liquidación de ${payroll.nombre} descargada.`, 'success');
  }

  verDetalle(payroll: Payroll): void {
    this.detalleSeleccionado = payroll;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.detalleSeleccionado = null;
  }

  generarLiquidaciones() {
    const token = localStorage.getItem('erp_token');
    if (!token) {
      setTimeout(() => this.toastService.show('Sesión expirada.', 'warning'), 0);
      return;
    }

    this.isGenerating = true;
    this.liquidacionesActivo = true;

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.post<any>(
      'http://54.87.191.204:8000/api/remuneraciones/calcular/',
      { mes: this.mesSeleccionado, anio: this.anioSeleccionado },
      { headers }
    ).subscribe({
      next: (response) => {
        setTimeout(() => {
          this.isGenerating = false;
          this.liquidacionesActivo = false;
          const mensajeExito = response?.message || 'Liquidaciones generadas correctamente.';
          this.toastService.show(mensajeExito, 'success');
          this.cdr.detectChanges();
          this.cargarRemuneraciones();
        }, 0);
      },
      error: (error) => {
        setTimeout(() => {
          this.isGenerating = false;
          this.liquidacionesActivo = false;
          let mensaje = 'Error al generar liquidaciones.';
          if (error.error && typeof error.error === 'object') {
            mensaje = error.error.message || error.error.error || error.error.detail || mensaje;
          } else if (error.message) {
            mensaje = error.message;
          }
          this.toastService.show(mensaje, 'warning');
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  // ==========================================
  // GESTIÓN DE IMPAGOS Y PAGOS (Issue #79)
  // ==========================================
  toggleSeleccion(payroll: Payroll) {
    payroll.selected = !payroll.selected;
  }

  toggleSeleccionTodos(event: any) {
    const checked = event.target.checked;
    this.filteredPayrollData.forEach(p => p.selected = checked);
  }

  formalizarPagos() {
    const token = localStorage.getItem('erp_token');
    if (!token) return;

    const pagados = this.filteredPayrollData.filter(p => p.selected).map(p => p.id);
    const impagos: string[] = []; // Ya no agrupamos desmarcados automáticamente

    if (pagados.length === 0) {
      this.toastService.show('No hay registros seleccionados para pagar.', 'warning');
      return;
    }

    this.isFormalizing = true;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.put<any>(
      `http://54.87.191.204:8000/api/remuneraciones/lote/pagar/`,
      { pagados, impagos },
      { headers }
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.show(res.message, 'success');
          this.filteredPayrollData.forEach(p => {
            if (pagados.includes(p.id)) p.estadoPago = 'Pagado';
          });
        } else {
          this.toastService.show(res.message, 'error');
        }
        this.isFormalizing = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error formalizando pagos', err);
        const mensaje = err.error?.message || 'Error al procesar pagos en lote';
        this.toastService.show(mensaje, 'error');
        this.isFormalizing = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirModalImpago() {
    this.motivoImpago = '';
    this.showModalImpago = true;
  }

  cerrarModalImpago() {
    this.showModalImpago = false;
    this.motivoImpago = '';
  }

  confirmarImpagos() {
    const token = localStorage.getItem('erp_token');
    if (!token) return;

    const impagos = this.filteredPayrollData.filter(p => p.selected).map(p => p.id);

    if (impagos.length === 0) {
      this.toastService.show('No hay registros seleccionados para marcar como impago.', 'warning');
      return;
    }

    if (!this.motivoImpago.trim()) {
      this.toastService.show('El motivo es obligatorio.', 'warning');
      return;
    }

    this.isFormalizing = true;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.put<any>(
      `http://54.87.191.204:8000/api/remuneraciones/lote/impago/`,
      { impagos, motivo: this.motivoImpago },
      { headers }
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.show(res.message, 'success');
          this.filteredPayrollData.forEach(p => {
            if (impagos.includes(p.id)) {
              p.estadoPago = 'Impago';
              // Here we could add logic to store 'motivo_impago' on the object if needed, 
              // but it's not strictly necessary for the current UI.
            }
          });
          this.cerrarModalImpago();
        } else {
          this.toastService.show(res.message, 'error');
        }
        this.isFormalizing = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error declarando impagos', err);
        const mensaje = err.error?.message || 'Error al procesar impagos en lote';
        this.toastService.show(mensaje, 'error');
        this.isFormalizing = false;
        this.cdr.detectChanges();
      }
    });
  }

}
