import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute } from '@angular/router';

interface Payroll {
  id: number;
  rut: string;
  nombre: string;
  cargo: string;
  sueldoBase: number;
  afp: number;
  descuentos: number;
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
}

@Component({
  selector: 'app-remuneraciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './remuneraciones.component.html',
  styleUrls: ['./remuneraciones.component.css']
})
export class RemuneracionesComponent implements OnInit {
  
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);

  // Tabs
  activeTab: 'nomina' | 'horasExtra' = 'nomina';

  // Formulario y datos
  horasExtraForm: FormGroup;
  historialHorasExtra: HorasExtraRecord[] = [];
  // TODO: Reemplazar con llamada al servicio de nómina (backend pendiente)
  payrollData: Payroll[] = [
    {
      id: 1,
      rut: '12345678-9',
      nombre: 'Juan Carlos Pérez',
      cargo: 'Profesor de Programación',
      sueldoBase: 2500000,
      afp: 206250,
      descuentos: 75000,
      neto: 2218750,
      periodo: 'Abril 2026'
    },
    {
      id: 2,
      rut: '23456789-0',
      nombre: 'María González Ruiz',
      cargo: 'Jefa de Recursos Humanos',
      sueldoBase: 2800000,
      afp: 231000,
      descuentos: 84000,
      neto: 2485000,
      periodo: 'Abril 2026'
    },
    {
      id: 3,
      rut: '34567890-1',
      nombre: 'Roberto López Silva',
      cargo: 'Encargado de Mantenimiento',
      sueldoBase: 1800000,
      afp: 148500,
      descuentos: 54000,
      neto: 1597500,
      periodo: 'Abril 2026'
    },
    {
      id: 4,
      rut: '45678901-2',
      nombre: 'Francisca Martínez Díaz',
      cargo: 'Secretaria Administrativa',
      sueldoBase: 1900000,
      afp: 156750,
      descuentos: 57000,
      neto: 1686250,
      periodo: 'Abril 2026'
    },
    {
      id: 5,
      rut: '56789012-3',
      nombre: 'Carlos Rodríguez Fuentes',
      cargo: 'Profesor de Electricidad',
      sueldoBase: 2600000,
      afp: 214500,
      descuentos: 78000,
      neto: 2307500,
      periodo: 'Abril 2026'
    }
  ];
  
  constructor() {
    this.horasExtraForm = this.fb.group({
      empleadoId: ['', Validators.required],
      horas: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      recargo: [50, Validators.required]
    });
  }

  ngOnInit() {
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
      fecha: new Date()
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
    return this.payrollData.reduce((sum, p) => sum + p.sueldoBase, 0);
  }
  
  getTotalNeto(): number {
    return this.payrollData.reduce((sum, p) => sum + p.neto, 0);
  }
  descargarPDF(payroll: Payroll) {
    this.toastService.show(`Generando liquidación para ${payroll.nombre}...`, 'info');
    // TODO: Integrar jsPDF o servicio backend para exportación.
  }
}
