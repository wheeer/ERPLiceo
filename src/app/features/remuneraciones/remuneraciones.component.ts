import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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

@Component({
  selector: 'app-remuneraciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './remuneraciones.component.html',
  styleUrls: ['./remuneraciones.component.css']
})
export class RemuneracionesComponent {
  
  // Mock: 5 registros de nómina
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
    alert(`Mock: Generando PDF de liquidación para ${payroll.nombre}...`);
    // Aquí iría la lógica real usando librerías como jsPDF o llamadas al backend.
  }
}
