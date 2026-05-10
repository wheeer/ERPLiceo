import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-asistencia',
  standalone: true, 
  imports: [CommonModule, FormsModule], 
  templateUrl: './asistencia.component.html',
  styleUrls: ['./asistencia.component.css']
})
export class AsistenciaComponent implements OnInit {
  empleadosActivos: any[] = [];
  fechaHoy: string = new Date().toISOString().split('T')[0];
  mensajeConfirmacion: string = '';
  mensajeError: string = '';
  
  diaCerrado: boolean = false; 
  esCorreccion: boolean = false; 

  estadosPosibles = ['Presente', 'Ausente', 'Tardanza', 'Licencia', 'Horas Extra'];

  ngOnInit() {
    // CARGAMOS EMPLEADOS DE PRUEBA PARA QUE FUNCIONE PERFECTO AL MOSTRARLO
    this.empleadosActivos = [
      { _id: 1, rut: '12345678-9', nombre_completo: 'Juan Carlos Pérez', estadoAsistencia: '', horasExtra: null },
      { _id: 2, rut: '23456789-0', nombre_completo: 'María González Ruiz', estadoAsistencia: '', horasExtra: null },
      { _id: 3, rut: '34567890-1', nombre_completo: 'Roberto López Silva', estadoAsistencia: '', horasExtra: null }
    ];
  }

  reabrirDia() {
    this.diaCerrado = false; 
    this.esCorreccion = true; 
    this.mensajeConfirmacion = '';
    this.mensajeError = '🔓 Día reabierto. Por favor corrija los datos y vuelva a guardar.';
  }

  guardarTodo() {
    this.mensajeError = '';
    this.mensajeConfirmacion = '';

    const faltanEstados = this.empleadosActivos.some(emp => emp.estadoAsistencia === '');
    if (faltanEstados) {
      this.mensajeError = 'Debes seleccionar un estado para todos los empleados antes de guardar.';
      return;
    }

    const horasExtraInvalidas = this.empleadosActivos.some(
      emp => emp.estadoAsistencia === 'Horas Extra' && (emp.horasExtra < 1 || emp.horasExtra > 2)
    );
    if (horasExtraInvalidas) {
      this.mensajeError = 'Las Horas Extra solo pueden ser 1 o 2 horas según la ley.';
      return;
    }

    this.mensajeConfirmacion = `Asistencia guardada con éxito para ${this.empleadosActivos.length} empleados.`;
    this.diaCerrado = true;
  }
}