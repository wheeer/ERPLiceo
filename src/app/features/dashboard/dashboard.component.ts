import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, ViewChildren, ViewChild, QueryList } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule, ChartComponent } from 'ng-apexcharts';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from './dashboard.service';
import { DashboardPdfService } from './dashboard-pdf.service';

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
  imports: [CommonModule, RouterModule, FormsModule, NgApexchartsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private pdfService = inject(DashboardPdfService);
  private cdr = inject(ChangeDetectorRef);
  userRole: string | null = null;
  private pollingSubscription!: Subscription;

  @ViewChildren(ChartComponent) charts!: QueryList<ChartComponent>;
  @ViewChild('chartModalRrhh') chartModalRrhh!: ChartComponent;
  @ViewChild('chartModalRemu') chartModalRemu!: ChartComponent;
  @ViewChild('chartModalInv') chartModalInv!: ChartComponent;
  isExportingPdf = false;

  // Métricas y carga
  metrics: any[] = [];
  isLoadingMetrics = true;
  isLoadingChartRRHH = true;
  isLoadingChartRemu = true;
  isLoadingChartInv = true;

  // Modal de Expansión
  isModalClosing = false;
  expandedChart: 'rrhh' | 'remuneraciones' | 'inventario' | null = null;
  isMaximized = false;

  // TODO: Reemplazar con llamada al servicio de auditoría (backend pendiente)
  activities: any[] = [];

  filteredMetrics: any[] = [];
  filteredActivities: any[] = [];

  // Filtros visuales (Fase 1: Mockups)
  // Filtros Asistencia
  asistenciaTipoFiltro: 'diario' | 'rango_fechas' | 'mensual' | 'anual' = 'mensual';
  asistenciaDiario: string = new Date().toISOString().split('T')[0];
  asistenciaRangoInicio: string = new Date().toISOString().split('T')[0];
  asistenciaRangoFin: string = new Date().toISOString().split('T')[0];
  asistenciaMes: string = this.getCurrentMonthString();
  asistenciaAnio: string = new Date().getFullYear().toString();
  
  availableYears: number[] = Array.from({length: 21}, (_, i) => 2010 + i);

  // Filtros Remuneraciones
  remuTipoFiltro: 'mes_especifico' | 'rango_meses' | 'anio_especifico' | 'rango_anios' = 'rango_meses';
  remuMes: string = this.getCurrentMonthString();
  remuMesInicio: string = this.getPastMonthString(2);
  remuMesFin: string = this.getCurrentMonthString();
  remuAnio: string = new Date().getFullYear().toString();
  remuAnioInicio: string = (new Date().getFullYear() - 2).toString();
  remuAnioFin: string = new Date().getFullYear().toString();

  selectedCategory: string = 'Todas';

  private getCurrentMonthString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  private getPastMonthString(monthsAgo: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  public formatDateLabel(val: string): string {
    if (!val) return val;
    const parts = val.split('-');
    if (parts.length === 1) return val;
    
    const mapMes: any = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
      '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
    };
    
    if (parts.length === 2) {
      return `${mapMes[parts[1]]} ${parts[0]}`;
    }
    if (parts.length === 3) {
      return `${parts[2]} ${mapMes[parts[1]]} ${parts[0]}`;
    }
    return val;
  }

  // Opciones de Gráficos (ApexCharts - Mockups)
  public rrhhChartOptions: any;
  public remuneracionesChartOptions: any;
  public inventarioChartOptions: any;

  ngOnInit() {
    this.userRole = this.authService.getUserRole();
    this.initChartConfigs();

    // Primer tick diferido para evitar NG0100 (ExpressionChangedAfterItHasBeenCheckedError)
    setTimeout(() => {
      this.loadMetrics();
      this.loadActivities();
      this.loadCharts();
    }, 0);

    // Polling cada 30 segundos tras la carga inicial
    this.pollingSubscription = timer(30000, 30000).subscribe(() => {
      this.loadCharts(false);
      this.loadMetrics();
      this.loadActivities();
    });
  }

  ngOnDestroy() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  onAsistenciaFilterTypeChange(event: any) {
    this.asistenciaTipoFiltro = event.target.value;
    this.loadCharts();
  }

  onAsistenciaDateChange(field: 'diario' | 'rangoInicio' | 'rangoFin' | 'mes' | 'anio', event: any) {
    const val = event.target.value;
    if (!val) return;

    if (field === 'diario') this.asistenciaDiario = val;
    else if (field === 'rangoInicio') this.asistenciaRangoInicio = val;
    else if (field === 'rangoFin') this.asistenciaRangoFin = val;
    else if (field === 'mes') this.asistenciaMes = val;
    else if (field === 'anio') this.asistenciaAnio = val;

    this.loadCharts();
  }

  onRemuFilterTypeChange(event: any) {
    this.remuTipoFiltro = event.target.value;
    this.loadCharts();
  }

  onRemuDateChange(field: 'mes' | 'mesInicio' | 'mesFin' | 'anio' | 'anioInicio' | 'anioFin', event: any) {
    const val = event.target.value;
    if (!val) return;

    if (field === 'mes') this.remuMes = val;
    else if (field === 'mesInicio') this.remuMesInicio = val;
    else if (field === 'mesFin') this.remuMesFin = val;
    else if (field === 'anio') this.remuAnio = val;
    else if (field === 'anioInicio') this.remuAnioInicio = val;
    else if (field === 'anioFin') this.remuAnioFin = val;

    this.loadCharts();
  }

  onFilterChange(event?: any, type?: 'category') {
    if (event && type === 'category') {
      this.selectedCategory = event.target.value;
      this.loadCharts();
    }
  }

  openChartModal(chart: 'rrhh' | 'remuneraciones' | 'inventario') {
    this.expandedChart = chart;
    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }

  closeChartModal() {
    this.expandedChart = null;
    this.isMaximized = false;
    document.body.style.overflow = ''; // Restaurar scroll
  }

  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
  }

  // Pre-instantiated static objects for thumbnails to prevent re-rendering on change detection
  chartThumbnailRrhh: any = { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, height: 120, animations: { enabled: false }, dynamicAnimation: { enabled: false } };
  chartThumbnailRemu: any = { type: 'bar', stacked: true, toolbar: { show: false }, zoom: { enabled: false }, height: 120, animations: { enabled: false }, dynamicAnimation: { enabled: false } };
  chartThumbnailInv: any = { type: 'bar', stacked: true, toolbar: { show: false }, zoom: { enabled: false }, height: 120, animations: { enabled: false }, dynamicAnimation: { enabled: false } };

  thumbnailXAxisRrhh: any = { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } };
  thumbnailXAxisRemu: any = { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } };
  thumbnailXAxisInv: any = { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } };

  thumbnailYAxisBase: any = { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } };
  thumbnailGridBase: any = { show: false };
  thumbnailDataLabelsBase: any = { enabled: false };

  // Pre-instantiated options for Modals
  chartModalRrhhOptions: any = { type: 'area', height: 550, toolbar: { show: false }, animations: { enabled: true }, dynamicAnimation: { enabled: false } };
  chartModalRemuOptions: any = { type: 'bar', stacked: true, height: 550, toolbar: { show: false }, animations: { enabled: true }, dynamicAnimation: { enabled: false } };
  chartModalInvOptions: any = { type: 'bar', stacked: true, height: 550, toolbar: { show: false }, animations: { enabled: true }, dynamicAnimation: { enabled: false } };

  private initChartConfigs() {
    // Configuraciones base (sin datos)
    this.rrhhChartOptions = {
      series: [],
      chart: { type: "area", height: 280, toolbar: { show: false }, animations: { enabled: true, dynamicAnimation: { enabled: false } } },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth" },
      xaxis: { categories: [] },
      yaxis: {
        decimalsInFloat: 0,
        labels: { formatter: function (val: number) { return Math.round(val).toString(); } }
      },
      colors: ["#3b82f6"]
    };

    this.remuneracionesChartOptions = {
      series: [],
      chart: { type: "bar", height: 280, stacked: true, toolbar: { show: false }, animations: { enabled: true, dynamicAnimation: { enabled: false } } },
      plotOptions: { bar: { horizontal: false, columnWidth: '50%' } },
      xaxis: { categories: [] },
      yaxis: {
        labels: {
          formatter: function (val: any) {
            if (val === undefined || val === null) return '';
            return Number(val).toLocaleString('es-CL');
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function (val: any) {
          if (val === undefined || val === null) return '';
          return Number(val).toLocaleString('es-CL');
        }
      },
      tooltip: {
        y: {
          formatter: function (val: any) {
            if (val === undefined || val === null) return '';
            return '$ ' + Number(val).toLocaleString('es-CL');
          }
        }
      },
      colors: ["#10b981", "#f59e0b"]
    };

    this.inventarioChartOptions = {
      series: [],
      chart: { type: "bar", height: 280, stacked: true, toolbar: { show: false }, animations: { enabled: true, dynamicAnimation: { enabled: false } } },
      plotOptions: { bar: { horizontal: true } },
      xaxis: { categories: [], decimalsInFloat: 0 }, // For horizontal bar charts, values are on X-axis
      yaxis: { decimalsInFloat: 0 },
      colors: ["#10b981", "#f59e0b", "#ef4444"]
    };
  }

  private loadCharts(showSpinner: boolean = true) {
    let rrhhQuery = `?tipo=${this.asistenciaTipoFiltro}`;
    if (this.asistenciaTipoFiltro === 'diario') rrhhQuery += `&fecha=${this.asistenciaDiario}`;
    else if (this.asistenciaTipoFiltro === 'rango_fechas') rrhhQuery += `&fecha_inicio=${this.asistenciaRangoInicio}&fecha_fin=${this.asistenciaRangoFin}`;
    else if (this.asistenciaTipoFiltro === 'mensual') {
      const [year, month] = this.asistenciaMes.split('-');
      rrhhQuery += `&mes=${month}&anio=${year}`;
    } else if (this.asistenciaTipoFiltro === 'anual') {
      rrhhQuery += `&anio=${this.asistenciaAnio}`;
    }

    // 1. Cargar Gráfico RRHH (Desde módulo nativo)
    if (this.userRole === 'Administrador_General' || this.userRole === 'Encargado_RRHH') {
      if (showSpinner) this.isLoadingChartRRHH = true;
      this.dashboardService.getChartRRHH(rrhhQuery).pipe(delay(1200)).subscribe({
        next: (res) => {
          if (res.success && res.resumen_cronologico) {
            const rawCategories = res.resumen_cronologico.map((item: any) => item.fecha);
            const categories = rawCategories.map((val: string) => this.formatDateLabel(val));
            const seriesData = res.resumen_cronologico.map((item: any) => item.ausencias);

            this.rrhhChartOptions = {
              ...this.rrhhChartOptions,
              series: [{ name: "Ausencias", data: seriesData }],
              xaxis: { ...this.rrhhChartOptions.xaxis, categories: categories }
            };
            this.thumbnailXAxisRrhh = { ...this.thumbnailXAxisRrhh, categories: categories };
          }
          this.isLoadingChartRRHH = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error("Error cargando chart RRHH", err);
          this.isLoadingChartRRHH = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.isLoadingChartRRHH = false;
    }

    // 2. Cargar Gráfico Remuneraciones (Desde módulo nativo)
    if (this.userRole === 'Administrador_General' || this.userRole === 'Encargado_Remuneraciones') {
      let remuQuery = `?tipo=${this.remuTipoFiltro}`;
      if (this.remuTipoFiltro === 'mes_especifico') {
        const [y, m] = this.remuMes.split('-');
        remuQuery += `&mes=${m}&anio=${y}`;
      } else if (this.remuTipoFiltro === 'rango_meses') {
        const [y1, m1] = this.remuMesInicio.split('-');
        const [y2, m2] = this.remuMesFin.split('-');
        remuQuery += `&mes_inicio=${m1}&anio_inicio=${y1}&mes_fin=${m2}&anio_fin=${y2}`;
      } else if (this.remuTipoFiltro === 'anio_especifico') {
        remuQuery += `&anio=${this.remuAnio}`;
      } else if (this.remuTipoFiltro === 'rango_anios') {
        remuQuery += `&anio_inicio=${this.remuAnioInicio}&anio_fin=${this.remuAnioFin}`;
      }

      if (showSpinner) this.isLoadingChartRemu = true;
      this.dashboardService.getChartRemuneraciones(remuQuery).pipe(delay(1200)).subscribe({
        next: (res) => {
          if (res.success && res.resumen_cronologico) {
            const rawCategories = res.resumen_cronologico.map((item: any) => item.fecha);
            const categories = rawCategories.map((val: string) => this.formatDateLabel(val));
            const haberesData = res.resumen_cronologico.map((item: any) => item.total_haberes);
            const descuentosData = res.resumen_cronologico.map((item: any) => item.total_descuentos);

            this.remuneracionesChartOptions = {
              ...this.remuneracionesChartOptions,
              series: [
                { name: "Haberes", data: haberesData },
                { name: "Descuentos", data: descuentosData }
              ],
              xaxis: { ...this.remuneracionesChartOptions.xaxis, categories: categories },
              dataLabels: {
                enabled: false,
              },
              yaxis: {
                labels: {
                  formatter: (value: number) => {
                    return "$ " + value.toLocaleString("es-CL");
                  }
                }
              },
              tooltip: {
                y: {
                  formatter: (value: number) => {
                    return "$ " + value.toLocaleString("es-CL");
                  }
                }
              }
            };
            this.thumbnailXAxisRemu = { ...this.thumbnailXAxisRemu, categories: categories };
          }
          this.isLoadingChartRemu = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          if (err.status === 403) {
            console.warn("Acceso denegado a montos financieros");
          } else {
            console.error("Error cargando chart Remuneraciones", err);
          }
          this.isLoadingChartRemu = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.isLoadingChartRemu = false;
    }

    // 3. Cargar Gráfico Inventario (Agrupando en el Frontend)
    if (this.userRole === 'Administrador_General' || this.userRole === 'Encargado_Bodega') {
      if (showSpinner) this.isLoadingChartInv = true;
      this.dashboardService.getChartInventario(this.selectedCategory).pipe(delay(1200)).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const articulos = res.data;

            // Filtrar por categoría en el frontend si es necesario
            const filtrados = this.selectedCategory !== 'Todas'
              ? articulos.filter((a: any) => a.categoria === this.selectedCategory)
              : articulos;

            const grouped: any = {};
            filtrados.forEach((a: any) => {
              const ubi = a.ubicacion || 'Sin Ubicación';
              const est = a.estado || 'Desconocido';
              const qty = a.stock_total || 0;

              if (!grouped[ubi]) grouped[ubi] = { 'Operativo': 0, 'En Reparación': 0, 'Crítico': 0 };

              if (est === 'Operativo' || est === 'Disponible') grouped[ubi]['Operativo'] += qty;
              else if (est === 'En Reparación' || est === 'En Mantención') grouped[ubi]['En Reparación'] += qty;
              else if (est === 'Crítico') grouped[ubi]['Crítico'] += qty;
            });

            const ubicaciones = Object.keys(grouped);
            const operativoData = ubicaciones.map(u => grouped[u]['Operativo']);
            const reparacionData = ubicaciones.map(u => grouped[u]['En Reparación']);
            const criticoData = ubicaciones.map(u => grouped[u]['Crítico']);

            this.inventarioChartOptions = {
              ...this.inventarioChartOptions,
              series: [
                { name: "Operativo", data: operativoData },
                { name: "En Reparación", data: reparacionData },
                { name: "Crítico", data: criticoData }
              ],
              xaxis: { ...this.inventarioChartOptions.xaxis, categories: ubicaciones }
            };
            this.thumbnailXAxisInv = { ...this.thumbnailXAxisInv, categories: ubicaciones };
          }
          this.isLoadingChartInv = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error("Error cargando chart Inventario", err);
          this.isLoadingChartInv = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.isLoadingChartInv = false;
    }
  }

  private loadMetrics() {
    if (this.metrics.length === 0) {
      this.isLoadingMetrics = true;
    }
    this.dashboardService.getMetrics().pipe(delay(1200)).subscribe({
      next: (data) => {
        // Lógica de semaforización de ausentismo
        const tasaAusentismo = data.empleados_activos > 0 ? (data.ausencias_mes / data.empleados_activos) * 100 : 0;
        let colorAsistencia = 'normal';
        let subtextAsistencia = 'Asistencia dentro del rango esperado (<=5%)';

        if (tasaAusentismo > 10) {
          colorAsistencia = 'red';
          subtextAsistencia = 'Alerta Crítica: Alto Ausentismo (>10%)';
        } else if (tasaAusentismo > 5) {
          colorAsistencia = 'yellow';
          subtextAsistencia = 'Precaución: Ausentismo elevado (>5%)';
        }

        // Lógica de semaforización de inventario
        let colorInventario = 'normal';
        let subtextInventario = 'Stock general en niveles óptimos';
        if (data.articulos_criticos > 10) {
          colorInventario = 'red';
          subtextInventario = 'Alerta Crítica: Múltiples insumos agotados';
        } else if (data.articulos_criticos > 0) {
          colorInventario = 'yellow';
          subtextInventario = 'Precaución: Insumos requieren reposición';
        }

        this.metrics = [
          { title: 'Total Personal Activo', value: data.empleados_activos.toString(), icon: 'users', color: 'normal', subtext: 'Empleados actualmente operativos', path: '/app/rrhh' },
          { title: 'Artículos con Stock Crítico', value: data.articulos_criticos.toString(), icon: 'alert', color: colorInventario, subtext: subtextInventario, path: '/app/inventario' },
          { title: 'Ausencias (Últ. 30 días)', value: data.ausencias_mes.toString(), icon: 'bell', color: colorAsistencia, subtext: subtextAsistencia, path: '/app/rrhh' }
        ];
        this.isLoadingMetrics = false;
        this.applyRoleFilters();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar métricas', err);
        this.isLoadingMetrics = false;
        this.applyRoleFilters();
        this.cdr.detectChanges();
      }
    });
  }

  private loadActivities() {
    this.dashboardService.getActivities().pipe(delay(1200)).subscribe({
      next: (res) => {
        if (res.success) {
          // Convertimos strings de fecha a objetos Date
          this.activities = res.data.map((a: any) => ({
            ...a,
            timestamp: new Date(a.timestamp)
          }));
        } else {
          this.activities = [];
        }
        this.applyRoleFilters();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar actividades', err);
        this.activities = [];
        this.applyRoleFilters();
        this.cdr.detectChanges();
      }
    });
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

  async exportToPDF() {
    this.isExportingPdf = true;
    this.cdr.detectChanges();

    try {
      const chartURIs: string[] = [];

      // Extraemos la URI de cada gráfico miniatura renderizado en pantalla
      for (const chart of this.charts.toArray()) {
        try {
          const res = await chart.dataURI();
          if (res && 'imgURI' in res && typeof res.imgURI === 'string') {
            chartURIs.push(res.imgURI);
          }
        } catch (e) {
          console.error('Error extrayendo imagen del gráfico:', e);
        }
      }

      await this.pdfService.generateDashboardReport(this.metrics, chartURIs);
    } catch (error) {
      console.error('Error generando PDF general:', error);
    } finally {
      this.isExportingPdf = false;
      this.cdr.detectChanges();
    }
  }

  async exportModalToPDF() {
    if (!this.expandedChart) return;

    let chartTitle = '';
    let filterContext = '';
    let summaryData: any[][] = [];
    let chartComponent: any = null;

    if (this.expandedChart === 'rrhh') {
      chartTitle = 'Asistencia y RRHH';
      let fechaMostrada = this.asistenciaMes;
      if (this.asistenciaTipoFiltro === 'diario') fechaMostrada = this.asistenciaDiario;
      else if (this.asistenciaTipoFiltro === 'rango_fechas') fechaMostrada = `${this.asistenciaRangoInicio} al ${this.asistenciaRangoFin}`;
      else if (this.asistenciaTipoFiltro === 'anual') fechaMostrada = this.asistenciaAnio;
      
      filterContext = `Ver por: ${this.asistenciaTipoFiltro} - Fecha: ${fechaMostrada}`;
      chartComponent = this.chartModalRrhh;

      const categories = this.rrhhChartOptions.xaxis?.categories || [];
      const dataAusencias = this.rrhhChartOptions.series[0]?.data || [];

      const totalAusencias = dataAusencias.reduce((a: number, b: number) => a + b, 0);
      const diaMax = categories[dataAusencias.indexOf(Math.max(...dataAusencias))] || 'N/A';

      summaryData = [
        ['Total Ausencias Período', totalAusencias.toString()],
        ['Día/Mes más crítico', diaMax.toString()]
      ];

    } else if (this.expandedChart === 'remuneraciones') {
      chartTitle = 'Gasto Financiero Remuneraciones';
      let fechaMostrada = this.remuMes;
      if (this.remuTipoFiltro === 'rango_meses') fechaMostrada = `${this.remuMesInicio} al ${this.remuMesFin}`;
      else if (this.remuTipoFiltro === 'anio_especifico') fechaMostrada = this.remuAnio;
      else if (this.remuTipoFiltro === 'rango_anios') fechaMostrada = `${this.remuAnioInicio} al ${this.remuAnioFin}`;
      
      filterContext = `Período: ${fechaMostrada}`;
      chartComponent = this.chartModalRemu;

      const dataHaberes = this.remuneracionesChartOptions.series[0]?.data || [];
      const dataDescuentos = this.remuneracionesChartOptions.series[1]?.data || [];

      const totalHaberes = dataHaberes.reduce((a: number, b: number) => a + b, 0);
      const totalDescuentos = dataDescuentos.reduce((a: number, b: number) => a + b, 0);
      const netoTotal = totalHaberes - totalDescuentos;

      const formatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });

      summaryData = [
        ['Total Bruto (Haberes)', formatter.format(totalHaberes)],
        ['Total Descuentos Ley', formatter.format(totalDescuentos)],
        ['Total Líquido a Pagar', formatter.format(netoTotal)]
      ];

    } else if (this.expandedChart === 'inventario') {
      chartTitle = 'Estado de Equipamiento e Inventario';
      filterContext = `Categoría: ${this.selectedCategory}`;
      chartComponent = this.chartModalInv;

      const dataOperativo = this.inventarioChartOptions.series[0]?.data || [];
      const dataCritico = this.inventarioChartOptions.series[2]?.data || [];

      const totalOp = dataOperativo.reduce((a: number, b: number) => a + b, 0);
      const totalCri = dataCritico.reduce((a: number, b: number) => a + b, 0);

      summaryData = [
        ['Equipos Operativos', totalOp.toString()],
        ['Equipos Críticos (Riesgo)', totalCri.toString()]
      ];
    }

    try {
      let chartUri = '';
      if (chartComponent) {
        const res = await chartComponent.dataURI();
        if (res && res.imgURI) chartUri = res.imgURI;
      }
      const currentUser = this.getRoleDisplayName();

      await this.pdfService.generateExecutiveReport(chartTitle, filterContext, currentUser, chartUri, summaryData);
    } catch (error) {
      console.error('Error generando Reporte Ejecutivo PDF:', error);
    }
  }
}
