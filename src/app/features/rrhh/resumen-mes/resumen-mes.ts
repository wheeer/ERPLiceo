import { Component } from '@angular/core';
// 1. Importamos CommonModule, que es la caja de herramientas que contiene a *ngFor
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-resumen-mes',
  standalone: true, // <-- ¡Esta línea es la responsable de que te deje importarlo!
  imports: [CommonModule],
  templateUrl: './resumen-mes.html',
  styleUrls: ['./resumen-mes.css']
})
export class ResumenMes {
  
  // 3. Creamos la variable 'resumenDatos' para que el HTML la encuentre.
  // Por ahora le pondremos datos de prueba manuales para que veas que funciona.
  // Más adelante, esto se llenará automáticamente con tu Backend (Django).
  resumenDatos: any[] = [
    {
      rut: "12345678-9",
      dias_trabajados: 20,
      ausencias: 1,
      tardanzas: 2,
      licencias: 0,
      horas_extra_total: 5.5
    },
    {
      rut: "87654321-0",
      dias_trabajados: 22,
      ausencias: 0,
      tardanzas: 0,
      licencias: 0,
      horas_extra_total: 2.0
    }
  ];

}