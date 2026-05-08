import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-asistencia',
  standalone: true, 
  imports: [CommonModule, FormsModule, HttpClientModule], 
  templateUrl: './asistencia.component.html'
})
export class AsistenciaComponent implements OnInit {
  empleadosActivos: any[] = [];
  fechaHoy: string = new Date().toISOString().split('T')[0];
  mensajeConfirmacion: string = '';
  mensajeError: string = '';
  
  // NUEVAS VARIABLES PARA EL H3
  diaCerrado: boolean = false; 
  esCorreccion: boolean = false; 

  estadosPosibles = ['Presente', 'Ausente', 'Tardanza', 'Licencia', 'Horas Extra'];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarEmpleados();
  }

  cargarEmpleados() {
    this.http.get<any[]>('/api/empleados?activos=true').subscribe(data => {
      this.empleadosActivos = data.map(emp => ({
        ...emp,
        estadoAsistencia: '', 
        horasExtra: null
      }));
    });
  }

  // NUEVA FUNCIÓN PARA EL H3
  reabrirDia() {
    this.diaCerrado = false; // Desbloquea la tabla
    this.esCorreccion = true; // Le avisa al sistema que es una edición
    this.mensajeConfirmacion = '🔓 Día reabierto. Puedes corregir los errores y volver a guardar.';
    this.mensajeError = '';
  }

  guardarTodo() {
    this.mensajeError = '';
    this.mensajeConfirmacion = '';

    const faltanEstados = this.empleadosActivos.some(emp => emp.estadoAsistencia === '');
    if (faltanEstados) {
      this.mensajeError = '⚠️ Error: Debes seleccionar un estado para todos los empleados antes de guardar.';
      return;
    }

    const horasExtraInvalidas = this.empleadosActivos.some(
      emp => emp.estadoAsistencia === 'Horas Extra' && (emp.horasExtra < 1 || emp.horasExtra > 2)
    );
    if (horasExtraInvalidas) {
      this.mensajeError = '⚠️ Error: Las Horas Extra solo pueden ser 1 o 2 horas máximo.';
      return;
    }

    const registros = this.empleadosActivos.map(emp => ({
      empleado_id: emp._id,
      fecha: this.fechaHoy,
      estado: emp.estadoAsistencia,
      horas_trabajadas: emp.estadoAsistencia === 'Horas Extra' ? 8 + emp.horasExtra : 8
    }));

    // Enviamos "es_correccion" para que el backend sepa que estamos usando el H3 y no nos tire error de duplicado
   this.http.post('/api/asistencia', { registros, fecha: this.fechaHoy, es_correccion: this.esCorreccion }).subscribe({
      next: () => {
        // H1 cumplido aquí y H3 aplicado bloqueando el día
        this.mensajeConfirmacion = `✅ Asistencia guardada para ${this.empleadosActivos.length} empleados.`;
        this.diaCerrado = true; // Bloquea la tabla al tener éxito
      },
      error: (err) => {
        if (err.status === 409 || err?.error?.message?.includes('duplicado')) {
          this.mensajeError = '❌ Alerta: Ya existe un registro de asistencia para la fecha de hoy.';
        } else {
          this.mensajeError = '❌ Ocurrió un error al guardar en el servidor.';
        }
      }
    });
  }
}