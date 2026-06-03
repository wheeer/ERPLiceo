
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';



interface Payroll {
  id: number;
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
  descuentoAsistencia: number;
}

interface HorasExtraRecord {
  id: number;
  empleado: string;
  sueldoBase: number;
  horas: number;
  recargo: number;
  montoTotal: number;
  fecha: Date;
  tipoDia: 'laboral' | 'finde' | 'festivo';
  autorizadoPor: string;
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
  detalleSeleccionado: Payroll | null = null;

  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  isLoading = true;
  isFetching = false;
  isGenerating = false;
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
      this.cdr.detectChanges();
    }, 0);

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any>(
      `http://127.0.0.1:8000/api/remuneraciones/${this.mesSeleccionado}/${this.anioSeleccionado}/`,
      { headers }
    ).subscribe({
      next: (response) => {
        this.payrollData = response.data;
        this.filteredPayrollData = response.data;
        setTimeout(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }, 0);
      },
      error: (error) => {
        console.error('Error al obtener remuneraciones', error);
        setTimeout(() => {
          this.toastService.show('Error al cargar remuneraciones.', 'warning');
          this.isLoading = false;
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  ngOnInit() {
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
    const empleado = this.payrollData.find(p => p.id === Number(formValues.empleadoId));
    if (!empleado) return;

    const valorHoraNormal = this.calcularHoraNormal(empleado.sueldoBase);
    const recargoMultiplicador = 1 + (formValues.recargo / 100);
    const montoTotal = valorHoraNormal * recargoMultiplicador * formValues.horas;

    const nuevoRegistro: HorasExtraRecord = {
      id: Date.now(),
      empleado: empleado.nombre,
      sueldoBase: empleado.sueldoBase,
      horas: formValues.horas,
      recargo: formValues.recargo,
      montoTotal: Math.round(montoTotal),
      fecha: new Date(),
      tipoDia: 'laboral',
      autorizadoPor: 'Registrado en Remuneraciones'
    };

    this.historialHorasExtra.unshift(nuevoRegistro);
    this.toastService.show(`Horas extra registradas: ${this.formatCurrency(Math.round(montoTotal))}`, 'success');
    this.horasExtraForm.patchValue({ horas: 1 });
  }

  eliminarRegistro(id: number) {
    this.historialHorasExtra = this.historialHorasExtra.filter(h => h.id !== id);
    this.toastService.show('Registro eliminado.', 'warning');
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

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredPayrollData = this.payrollData.filter(item =>
      item.nombre.toLowerCase().includes(query) ||
      item.rut.toLowerCase().includes(query) ||
      item.cargo.toLowerCase().includes(query)
    );
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
    const doc = new jsPDF();
    const nombreMes = this.meses.find(m => m.value === payroll.mes)?.nombre ?? payroll.mes;
    const fechaEmision = new Date().toLocaleDateString('es-CL');

    const azulOscuro: [number, number, number] = [30, 41, 59];
    const blanco: [number, number, number] = [255, 255, 255];
    const grisClaro: [number, number, number] = [248, 250, 252];
    const grisTexto: [number, number, number] = [100, 116, 139];
    const pageW = 210;
    const colDiv = 108;

    doc.setFillColor(...azulOscuro);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(...blanco);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LIQUIDACIÓN DE SUELDO', 14, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('ERP Liceos EMTP', pageW - 14, 10, { align: 'right' });
    doc.text(`Período: ${nombreMes} ${payroll.anio}`, pageW - 14, 17, { align: 'right' });

    doc.setTextColor(...grisTexto);
    doc.setFontSize(9);
    doc.text(`Fecha emisión: ${fechaEmision}`, 14, 37);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 41, pageW - 14, 41);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${payroll.nombre}`, 14, 50);
    doc.text(`RUT: ${payroll.rut}`, 14, 57);
    doc.text(`Cargo: ${payroll.cargo}`, 14, 64);
    doc.text(`Período: ${nombreMes} ${payroll.anio}`, 14, 71);
    doc.line(14, 76, pageW - 14, 76);

    const tablaY = 82;

    autoTable(doc, {
      startY: tablaY,
      head: [['HABERES', 'MONTO']],
      body: [
        ['Sueldo Base', this.formatCurrency(payroll.sueldoBase)],
        ['Gratificación', this.formatCurrency(payroll.gratificacion)],
        ['Haberes No Imponibles', ''],
        ['  Movilización', this.formatCurrency(payroll.movilizacion)],
        ['  Colación', this.formatCurrency(payroll.colacion)],
        ['Total Haberes', this.formatCurrency(payroll.totalHaberes)],
      ],
      headStyles: { fillColor: azulOscuro, textColor: blanco, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: grisClaro },
      columnStyles: { 0: { cellWidth: 55 }, 1: { halign: 'right', cellWidth: 30 } },
      willDrawCell: (data) => {
        if (data.section === 'body' && data.row.index === 2) {
          data.cell.styles.fillColor = [226, 232, 240];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      theme: 'plain',
      tableWidth: colDiv - 18,
      margin: { left: 14 },
    });

    const finalYHaberes = (doc as any).lastAutoTable.finalY;

    const descuentosBody: any[] = [
      ['AFP', `-${this.formatCurrency(payroll.afp)}`],
      ['Salud', `-${this.formatCurrency(payroll.salud)}`],
      ['Seguro Cesantía', `-${this.formatCurrency(payroll.seguroCesantia)}`],
    ];
    if (payroll.descuentoAsistencia > 0) {
      descuentosBody.push(['Dcto. Asistencia', `-${this.formatCurrency(payroll.descuentoAsistencia)}`]);
    }

    autoTable(doc, {
      startY: tablaY,
      head: [['DESCUENTOS', 'MONTO']],
      body: descuentosBody,
      headStyles: { fillColor: azulOscuro, textColor: blanco, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: grisClaro },
      columnStyles: { 0: { cellWidth: 55 }, 1: { halign: 'right', cellWidth: 28 } },
      theme: 'plain',
      tableWidth: pageW - colDiv - 8,
      margin: { left: colDiv + 2 },
    });

    const finalYDescuentos = (doc as any).lastAutoTable.finalY;
    const resumenY = Math.max(finalYHaberes, finalYDescuentos) + 8;

    doc.setFillColor(219, 234, 254);
    doc.roundedRect(14, resumenY, 90, 14, 2, 2, 'F');
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL HABERES: ${this.formatCurrency(payroll.totalHaberes)}`, 59, resumenY + 9, { align: 'center' });

    doc.setFillColor(254, 226, 226);
    doc.roundedRect(108, resumenY, 88, 14, 2, 2, 'F');
    doc.setTextColor(239, 68, 68);
    doc.text(`TOTAL DESC.: ${this.formatCurrency(payroll.totalDescuentos)}`, 152, resumenY + 9, { align: 'center' });

    const liquidoY = resumenY + 22;
    doc.setFillColor(...azulOscuro);
    doc.roundedRect(14, liquidoY, 182, 18, 3, 3, 'F');
    doc.setTextColor(...blanco);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`LÍQUIDO A RECIBIR: ${this.formatCurrency(payroll.neto)}`, 105, liquidoY + 12, { align: 'center' });

    const firmaY = liquidoY + 36;
    doc.setDrawColor(180, 180, 180);
    doc.line(30, firmaY, 90, firmaY);
    doc.line(120, firmaY, 180, firmaY);
    doc.setTextColor(...grisTexto);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Firma Empleador', 60, firmaY + 6, { align: 'center' });
    doc.text('Firma Trabajador', 150, firmaY + 6, { align: 'center' });

    doc.setFontSize(7);
    doc.text('Documento generado automáticamente por ERP Liceos EMTP', 105, 287, { align: 'center' });

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

  // ✅ Punto 1: eliminada validación payrollData.length === 0
  generarLiquidaciones() {
    const token = localStorage.getItem('erp_token');
    if (!token) {
      setTimeout(() => this.toastService.show('Sesión expirada.', 'warning'), 0);
      return;
    }

    this.isGenerating = true;
    this.liquidacionesActivo = true;
    this.cdr.detectChanges();

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.post<any>(
      'http://127.0.0.1:8000/api/remuneraciones/calcular/',
      { mes: this.mesSeleccionado, anio: this.anioSeleccionado },
      { headers }
    ).subscribe({
      next: (response) => {
        this.isGenerating = false;
        this.liquidacionesActivo = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.toastService.show('Liquidaciones generadas correctamente.', 'success');
        }, 0);
        this.cargarRemuneraciones();
      },
      error: (error) => {
        this.isGenerating = false;
        this.liquidacionesActivo = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          const mensaje = error.error?.message || 'Error al generar liquidaciones.';
          this.toastService.show(mensaje, 'warning');
        }, 0);
      }
    });
  }
}


