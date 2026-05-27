import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import {
  HttpClient,
  HttpClientModule
} from '@angular/common/http';

import { ActivatedRoute } from '@angular/router';
import { ToastService } from '../../core/services/toast.service';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Payroll {

  id: string;
  rut: string;
  nombre: string;
  cargo: string;

  sueldoBase: number;
  gratificacion: number;
  horasExtra: number;

  movilizacion: number;
  colacion: number;

  afp: number;
  salud: number;
  seguroCesantia: number;

  liquido: number;

  totalHaberes: number;
  descuento_asistencia: number;
}

interface HorasExtraRecord {

  empleadoId: string;
  horas: number;
  recargo: number;
}

@Component({
  selector: 'app-remuneraciones',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule
  ],

  templateUrl: './remuneraciones.component.html',
  styleUrls: ['./remuneraciones.component.css']
})

export class RemuneracionesComponent implements OnInit {

  // Dependencias
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);

  // Tabs
  activeTab: 'nomina' | 'horasExtra' = 'nomina';

  // Loading
  isLoading = false;

  // Selector período
  mesSeleccionado: number = 3;
  anioSeleccionado: number = 2026;

  // LISTA MESES
  meses = [
    { nombre: 'Enero', valor: 1 },
    { nombre: 'Febrero', valor: 2 },
    { nombre: 'Marzo', valor: 3 },
    { nombre: 'Abril', valor: 4 },
    { nombre: 'Mayo', valor: 5 },
    { nombre: 'Junio', valor: 6 },
    { nombre: 'Julio', valor: 7 },
    { nombre: 'Agosto', valor: 8 },
    { nombre: 'Septiembre', valor: 9 },
    { nombre: 'Octubre', valor: 10 },
    { nombre: 'Noviembre', valor: 11 },
    { nombre: 'Diciembre', valor: 12 }
  ];

  anios = [2025, 2026, 2027];

  // Datos reales API
  payrollData: Payroll[] = [];

  filteredPayrollData: Payroll[] = [];

  nominaPaginada: Payroll[] = [];

  // Formulario horas extra
  horasExtraForm: FormGroup;

  constructor() {

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

  ngOnInit(): void {

    this.obtenerRemuneraciones();
  }

 obtenerRemuneraciones() {

  const token = localStorage.getItem('token');

  this.isLoading = true;

  // LIMPIAR TABLA ANTES DE CONSULTAR
  this.payrollData = [];
  this.filteredPayrollData = [];
  this.nominaPaginada = [];

  this.http.get<any>(
    `http://127.0.0.1:8000/api/remuneraciones/${this.mesSeleccionado}/${this.anioSeleccionado}/`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  ).subscribe({

    next: (response) => {

      console.log('RESPUESTA API:', response);
      console.log(response.data);

      // SI NO HAY DATOS
      if (!response.data || response.data.length === 0) {

        this.payrollData = [];
        this.filteredPayrollData = [];
        this.nominaPaginada = [];

        this.isLoading = false;

        this.cdr.detectChanges();

        return;
      }

      // SI HAY DATOS
      this.payrollData = response.data.map((item: any) => ({

        ...item,

        totalHaberes:

          (item.sueldoBase || 0) +
          (item.gratificacion || 0) +
          (item.horasExtra || 0) +
          (item.movilizacion || 0) +
          (item.colacion || 0),

        descuento_asistencia:
          item.descuento_asistencia || 0
      }));

      this.filteredPayrollData = [...this.payrollData];

      this.nominaPaginada = [...this.payrollData];

      this.isLoading = false;

      this.cdr.detectChanges();
    },

    error: (error) => {

      console.error('ERROR API:', error);

      // LIMPIAR TABLA SI FALLA
      this.payrollData = [];
      this.filteredPayrollData = [];
      this.nominaPaginada = [];

      this.isLoading = false;

      this.cdr.detectChanges();
    }
  });
}

  cambiarPeriodo() {

    this.obtenerRemuneraciones();
  }

  formatCurrency(valor: number): string {

    if (!valor) {
      return '$0';
    }

    return '$' + valor.toLocaleString('es-CL');
  }

  onSearch(event: any) {

    const value = event.target.value.toLowerCase();

    this.filteredPayrollData = this.payrollData.filter(payroll =>

      payroll.nombre.toLowerCase().includes(value) ||
      payroll.rut.toLowerCase().includes(value) ||
      payroll.cargo.toLowerCase().includes(value)
    );

    this.nominaPaginada = this.filteredPayrollData;
  }

  changeTab(tab: 'nomina' | 'horasExtra') {

    this.activeTab = tab;
  }

  generarPDF(registro: Payroll) {

    const doc = new jsPDF();

    doc.setFontSize(18);

    doc.text('Liquidación de Sueldo', 14, 20);

    autoTable(doc, {

      startY: 30,

      body: [

        ['RUT', registro.rut],
        ['Nombre', registro.nombre],
        ['Cargo', registro.cargo],

        ['Sueldo Base', `$ ${registro.sueldoBase}`],
        ['Gratificación', `$ ${registro.gratificacion}`],
        ['Horas Extra', `$ ${registro.horasExtra}`],

        ['Movilización', `$ ${registro.movilizacion}`],
        ['Colación', `$ ${registro.colacion}`],

        ['AFP', `$ ${registro.afp}`],
        ['Salud', `$ ${registro.salud}`],
        ['Seguro Cesantía', `$ ${registro.seguroCesantia}`],

        ['Líquido', `$ ${registro.liquido}`]
      ]
    });

    doc.save(`liquidacion-${registro.rut}.pdf`);
  }
}