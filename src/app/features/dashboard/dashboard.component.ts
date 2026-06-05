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
  expandedChart: 'rrhh' | 'remuneraciones' | 'inventario' | null = null;

  // TODO: Reemplazar con llamada al servicio de auditoría (backend pendiente)
  activities: any[] = [];

  filteredMetrics: any[] = [];
  filteredActivities: any[] = [];

  // Filtros visuales (Fase 1: Mockups)
  selectedPeriod: string = 'anual';
  selectedCategory: string = 'Todas';

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

      // Polling cada 30 segundos tras la carga inicial
      this.pollingSubscription = timer(30000, 30000).subscribe(() => {
        this.loadMetrics();
        this.loadActivities();
        this.loadCharts();
      });
    }, 0);
  }

  ngOnDestroy() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  onFilterChange(event?: any, type?: 'period' | 'category') {
    if (event && type === 'period') {
      this.selectedPeriod = event.target.value;
    } else if (event && type === 'category') {
      this.selectedCategory = event.target.value;
    }
    this.loadCharts();
  }

  openChartModal(chart: 'rrhh' | 'remuneraciones' | 'inventario') {
    this.expandedChart = chart;
    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }

  closeChartModal() {
    this.expandedChart = null;
    document.body.style.overflow = ''; // Restaurar scroll
  }

  getModalChartOptions(options: any) {
    if (!options) return null;
    return {
      ...options.chart,
      height: 550
    };
  }

  getThumbnailChartOptions(options: any) {
    if (!options) return null;
    return {
      ...options.chart,
      toolbar: { show: false },
      zoom: { enabled: false },
      height: 120
    };
  }

  getThumbnailXAxis(options: any) {
    if (!options) return null;
    return {
      ...options.xaxis,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false }
    };
  }

  getThumbnailYAxis() {
    return {
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false }
    };
  }

  getThumbnailGrid() {
    return { show: false };
  }

  private initChartConfigs() {
    // Configuraciones base (sin datos)
    this.rrhhChartOptions = {
      series: [],
      chart: { type: "area", height: 280, toolbar: { show: false }, animations: { enabled: true, dynamicAnimation: { enabled: false } } },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth" },
      xaxis: { categories: [] },
      colors: ["#3b82f6"]
    };

    this.remuneracionesChartOptions = {
      series: [],
      chart: { type: "bar", height: 280, stacked: true, toolbar: { show: false }, animations: { enabled: true, dynamicAnimation: { enabled: false } } },
      plotOptions: { bar: { horizontal: false, columnWidth: '50%' } },
      xaxis: { categories: [] },
      colors: ["#10b981", "#f59e0b"]
    };

    this.inventarioChartOptions = {
      series: [],
      chart: { type: "bar", height: 280, stacked: true, toolbar: { show: false }, animations: { enabled: true, dynamicAnimation: { enabled: false } } },
      plotOptions: { bar: { horizontal: true } },
      xaxis: { categories: [] },
      colors: ["#10b981", "#f59e0b", "#ef4444"]
    };
  }

  private loadCharts() {
    // 1. Cargar Gráfico RRHH (Desde módulo nativo)
    this.isLoadingChartRRHH = true;
    this.dashboardService.getChartRRHH(this.selectedPeriod).pipe(delay(1200)).subscribe({
      next: (res) => {
        if (res.success && res.resumen_cronologico) {
          const categories = res.resumen_cronologico.map((item: any) => item.fecha);
          const seriesData = res.resumen_cronologico.map((item: any) => item.ausencias);
          
          this.rrhhChartOptions = {
            ...this.rrhhChartOptions,
            series: [{ name: "Ausencias", data: seriesData }],
            xaxis: { ...this.rrhhChartOptions.xaxis, categories: categories }
          };
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

    // 2. Cargar Gráfico Remuneraciones (Desde módulo nativo)
    if (this.userRole === 'Administrador_General' || this.userRole === 'Encargado_Remuneraciones') {
      this.isLoadingChartRemu = true;
      this.dashboardService.getChartRemuneraciones(this.selectedPeriod).pipe(delay(1200)).subscribe({
        next: (res) => {
          if (res.success && res.resumen_cronologico) {
            const categories = res.resumen_cronologico.map((item: any) => item.fecha);
            const haberesData = res.resumen_cronologico.map((item: any) => item.total_haberes);
            const descuentosData = res.resumen_cronologico.map((item: any) => item.total_descuentos);
            
            this.remuneracionesChartOptions = {
              ...this.remuneracionesChartOptions,
              series: [
                { name: "Total Haberes", data: haberesData },
                { name: "Total Descuentos", data: descuentosData }
              ],
              xaxis: { ...this.remuneracionesChartOptions.xaxis, categories: categories }
            };
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
    }

    // 3. Cargar Gráfico Inventario (Agrupando en el Frontend)
    this.isLoadingChartInv = true;
    this.dashboardService.getChartInventario(this.selectedCategory).subscribe({
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
      filterContext = `Rango: ${this.selectedPeriod}`;
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
      filterContext = `Rango: ${this.selectedPeriod}`;
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
