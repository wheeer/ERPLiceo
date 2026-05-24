import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HttpClient } from '@angular/common/http';






interface Payroll {
  id: number;
  rut: string;
  nombre: string;
  cargo: string;
  // Haberes imponibles
  sueldoBase: number;
  gratificacion: number;        // 25% del sueldo base (gratificación legal)
  // Haberes no imponibles
  movilizacion: number;
  colacion: number;
  // Totales
  totalHaberes: number;
  // Descuentos legales
  afp: number;
  salud: number;
  seguro_cesantia: number;
  // Descuentos asistencia
  descuento_asistencia: number;
  dias_trabajados: number;
  // Resultado
  neto: number;
  periodo: string;
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
  // Inyección de dependencias//
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  // Tabs
  activeTab: 'nomina' | 'horasExtra' = 'nomina';
  isLoading = true;

  mesSeleccionado: number = 5;
  anioSeleccionado: number = 2026;

  meses: any[] = [
  { value: 1, nombre: 'Enero' },
  { value: 2, nombre: 'Febrero' },
  { value: 3, nombre: 'Marzo' },
  { value: 4, nombre: 'Abril' },
  { value: 5, nombre: 'Mayo' },
  { value: 6, nombre: 'Junio' },
  { value: 7, nombre: 'Julio' },
  { value: 8, nombre: 'Agosto' },
  { value: 9, nombre: 'Septiembre' },
  { value: 10, nombre: 'Octubre' },
  { value: 11, nombre: 'Noviembre' },
  { value: 12, nombre: 'Diciembre' }
];

  // Formulario y datos
  horasExtraForm: FormGroup;
  historialHorasExtra: HorasExtraRecord[] = [];
  // TODO: Reemplazar con llamada al servicio de nómina (backend pendiente)
  payrollData: Payroll[] = [
    {
      id: 1, rut: '12345678-9', nombre: 'Juan Carlos Pérez', cargo: 'Profesor de Programación',
      sueldoBase: 2500000, gratificacion: 625000, movilizacion: 50000, colacion: 55000,
      totalHaberes: 3230000, afp: 358688, salud: 218750, seguro_cesantia: 18750,
      descuento_asistencia: 0, dias_trabajados: 30, neto: 2633812, periodo: 'Abril 2026'
    },
    {
      id: 2, rut: '23456789-0', nombre: 'María González Ruiz', cargo: 'Jefa de Recursos Humanos',
      sueldoBase: 2800000, gratificacion: 700000, movilizacion: 45000, colacion: 50000,
      totalHaberes: 3595000, afp: 401200, salud: 245000, seguro_cesantia: 21000,
      descuento_asistencia: 186667, dias_trabajados: 28, neto: 2741133, periodo: 'Abril 2026'
    },
    {
      id: 3, rut: '34567890-1', nombre: 'Roberto López Silva', cargo: 'Encargado de Mantenimiento',
      sueldoBase: 1800000, gratificacion: 450000, movilizacion: 40000, colacion: 45000,
      totalHaberes: 2335000, afp: 258278, salud: 157500, seguro_cesantia: 13500,
      descuento_asistencia: 0, dias_trabajados: 30, neto: 1905722, periodo: 'Abril 2026'
    },
    {
      id: 4, rut: '45678901-2', nombre: 'Francisca Martínez Díaz', cargo: 'Secretaria Administrativa',
      sueldoBase: 1900000, gratificacion: 475000, movilizacion: 40000, colacion: 50000,
      totalHaberes: 2465000, afp: 272794, salud: 166250, seguro_cesantia: 14250,
      descuento_asistencia: 0, dias_trabajados: 30, neto: 2011706, periodo: 'Abril 2026'
    },
    {
      id: 5, rut: '56789012-3', nombre: 'Carlos Rodríguez Fuentes', cargo: 'Profesor de Electricidad',
      sueldoBase: 2600000, gratificacion: 650000, movilizacion: 42000, colacion: 48000,
      totalHaberes: 3340000, afp: 379288, salud: 227500, seguro_cesantia: 19500,
      descuento_asistencia: 260000, dias_trabajados: 27, neto: 2453712, periodo: 'Abril 2026'
    }
  ];
  
  filteredPayrollData: Payroll[] = [];



constructor(
  private http: HttpClient
) {

  this.horasExtraForm = this.fb.group({
    empleadoId: ['', Validators.required],
    horas: [1, [
      Validators.required,
      Validators.min(1),
      Validators.max(10)
    ]],
    recargo: [50, Validators.required]
  });

}

// TODO: Reemplazar con llamada al servicio de nómina (backend pendiente) //
// -> Implementar método para cargar datos reales desde API//

cargarRemuneraciones() {

  this.http
    .get<any>( `http://127.0.0.1:8000/api/remuneraciones/${this.mesSeleccionado}/${this.anioSeleccionado}/`)
    .subscribe({

      next: (response) => {

        console.log('Respuesta API:', response);
        console.log('Datos nómina:', response.data);

        this.payrollData = response.data;

        this.filteredPayrollData = response.data;

      },

      error: (error) => {

        console.error(
          'Error al obtener remuneraciones',
          error
        );

      }

    });

}

  ngOnInit() {

    this.cargarRemuneraciones();
    setTimeout(() => {
      this.isLoading = false;
      this.cdr.detectChanges();
    }, 1200);

    this.filteredPayrollData = [...this.payrollData];
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
  }

  calcularHoraNormal(sueldoBase: number): number {
    // Fórmula legal chilena: (Sueldo Base / 30) * 28 / Jornada Semanal
    // Ley 21.561: Jornada de 42 horas semanales a partir de abril 2026
    const valorHora = (sueldoBase / 30) * 28 / 42;
    return valorHora;
  }

  calcularHorasExtra() {
    if (this.horasExtraForm.invalid) return;

    const formValues = this.horasExtraForm.value;
    const empleado = this.payrollData.find(p => p.id === Number(formValues.empleadoId));
    
    if (!empleado) return;

    const valorHoraNormal = this.calcularHoraNormal(empleado.sueldoBase);
    const recargoMultiplicador = 1 + (formValues.recargo / 100);
    const valorHoraExtra = valorHoraNormal * recargoMultiplicador;
    const montoTotal = valorHoraExtra * formValues.horas;

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
    
    this.toastService.show(`Horas extra calculadas y registradas: $${this.formatCurrency(Math.round(montoTotal))}`, 'success');
    this.horasExtraForm.patchValue({ horas: 1 });
  }

  eliminarRegistro(id: number) {
    this.historialHorasExtra = this.historialHorasExtra.filter(h => h.id !== id);
    this.toastService.show('Registro eliminado del historial.', 'warning');
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('es-CL');
  }
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
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
  }

  getTotalHorasMes(): number {
    return this.historialHorasExtra.reduce((sum, h) => sum + h.horas, 0);
  }

  getTotalHorasExtraMes(): number {
    return this.historialHorasExtra.reduce((sum, h) => sum + h.montoTotal, 0);
  }


   descargarPDF(payroll: Payroll) {
    this.toastService.show(`Generando liquidación para ${payroll.nombre}...`, 'info');
    // TODO: Integrar jsPDF o servicio backend para exportación.
  }
}



