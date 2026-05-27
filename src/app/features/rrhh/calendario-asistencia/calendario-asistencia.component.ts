import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-calendario-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendario-asistencia.component.html',
  styleUrl: './calendario-asistencia.component.css'
})
export class CalendarioAsistenciaComponent implements OnInit {
  empleados: any[] = [];
  empleadoSeleccionado: string = '';
  mesSeleccionado: number = 4; // Comenzamos en Abril para tu prueba visual
  anioSeleccionado: number = 2026;
  
  diasDelMes: any[] = [];
  resumen = { presente: 0, ausente: 0, tardanza: 0, licencia: 0 };

  meses = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' }
  ];
  anios = [2024, 2025, 2026];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarEmpleados();
  }

  cargarEmpleados() {
    // 1. Intenta cargar los empleados reales de la base de datos
    this.http.get<any[]>('/api/empleados').subscribe({
      next: (data) => {
        this.empleados = data.map(emp => ({ id: emp.rut, nombre: emp.nombre_completo }));
      },
      error: (err) => {
        console.error('Error de red, usando empleados de respaldo', err);
        // 2. Respaldo (Tu código original mantenido por si falla la API)
        this.empleados = [
          { id: '1', nombre: 'Juan Carlos Pérez' },
          { id: '2', nombre: 'María López' }
        ];
      }
    });
  }

  buscarAsistencia() {
    if (!this.empleadoSeleccionado) return;

    // Tu llamada HTTP original intacta
    const url = `/api/asistencia/${this.empleadoSeleccionado}/${this.mesSeleccionado}/${this.anioSeleccionado}`;
    
    this.http.get<any>(url).subscribe({
      next: (response) => {
        // Si el endpoint maestro funciona, usa los datos reales
        this.generarCalendario(response.data);
      },
      error: (err) => {
        console.warn('La ruta real aún no está habilitada. Activando simulación visual...');
        
        // La simulación añadida en caso de error para que puedas ver tu trabajo
        const datosSimulados = [
          { fecha: '2026-04-01', estado: 'Presente' },
          { fecha: '2026-04-02', estado: 'Presente' },
          { fecha: '2026-04-03', estado: 'Tardanza' },
          { fecha: '2026-04-06', estado: 'Ausente' },
          { fecha: '2026-04-07', estado: 'Licencia' },
          { fecha: '2026-04-08', estado: 'Presente' }
        ];
        this.generarCalendario(datosSimulados);
      }
    });
  }

  generarCalendario(asistenciasBD: any[]) {
    this.diasDelMes = [];
    this.resumen = { presente: 0, ausente: 0, tardanza: 0, licencia: 0 };
    
    const diasEnElMes = new Date(this.anioSeleccionado, this.mesSeleccionado, 0).getDate();

    for (let i = 1; i <= diasEnElMes; i++) {
      const fechaActual = new Date(this.anioSeleccionado, this.mesSeleccionado - 1, i);
      const esFinDeSemana = fechaActual.getDay() === 0 || fechaActual.getDay() === 6;
      
      let estadoDia = 'sin-registro';
      let claseColor = 'bg-gris'; // Fines de semana en gris por defecto

      if (!esFinDeSemana) {
        // Buscar si hay un registro para este día
        // Nota: Se usa split() para evitar errores de zona horaria con las fechas de Mongo
        const registro = asistenciasBD.find(a => {
          if (a.fecha && a.fecha.includes('-')) {
            const partes = a.fecha.split('-');
            return parseInt(partes[2], 10) === i;
          }
          return new Date(a.fecha).getDate() === i;
        });

        if (registro) {
          estadoDia = registro.estado.toLowerCase();
          if (estadoDia === 'presente') { claseColor = 'bg-verde'; this.resumen.presente++; }
          else if (estadoDia === 'ausente') { claseColor = 'bg-rojo'; this.resumen.ausente++; }
          else if (estadoDia === 'atraso' || estadoDia === 'tardanza') { claseColor = 'bg-amarillo'; this.resumen.tardanza++; }
          else if (estadoDia === 'licencia') { claseColor = 'bg-azul'; this.resumen.licencia++; }
        } else {
           claseColor = 'bg-blanco'; // Día hábil sin información
        }
      }

      this.diasDelMes.push({
        dia: i,
        esFinDeSemana: esFinDeSemana,
        clase: claseColor
      });
    }
  }
}