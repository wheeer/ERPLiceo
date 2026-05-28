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
  mesSeleccionado: number = 4; 
  anioSeleccionado: number = 2026;
  
  diasDelMes: any[] = [];
  resumen = { presente: 0, ausente: 0, tardanza: 0, licencia: 0 };
  mensajeError: string = ''; 

  meses = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' }
  ];
  anios = [2024, 2025, 2026];

  private baseUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarEmpleados();
  }

  cargarEmpleados() {
    this.http.get<any[]>(`${this.baseUrl}/empleados`).subscribe({
      next: (data) => {
        // SOLUCIÓN CLAVE: Guardamos el RUT como identificador para enlazar con la BD
        this.empleados = data.map(emp => ({ id: emp.rut, nombre: emp.nombre_completo }));
      },
      error: (err) => {
        this.mensajeError = 'No se pudieron cargar los empleados.';
      }
    });
  }

  buscarAsistencia() {
    if (!this.empleadoSeleccionado) return;
    this.mensajeError = ''; 
    
    const url = `${this.baseUrl}/asistencia/${this.mesSeleccionado}/${this.anioSeleccionado}?empleadoId=${this.empleadoSeleccionado}`;
    
    this.http.get<any>(url).subscribe({
      next: (response) => {
        this.generarCalendario(response.data || []);
      },
      error: (err) => {
        this.mensajeError = 'Error de conexión con el servidor.';
        this.diasDelMes = [];
        this.resumen = { presente: 0, ausente: 0, tardanza: 0, licencia: 0 };
      }
    });
  }

  generarCalendario(asistenciasBD: any[]) {
    this.diasDelMes = [];
    this.resumen = { presente: 0, ausente: 0, tardanza: 0, licencia: 0 };
    
    const diasEnElMes = new Date(this.anioSeleccionado, this.mesSeleccionado, 0).getDate();
    const primerDiaDelMes = new Date(this.anioSeleccionado, this.mesSeleccionado - 1, 1).getDay();
    const desfase = primerDiaDelMes === 0 ? 6 : primerDiaDelMes - 1;

    for (let i = 0; i < desfase; i++) {
      this.diasDelMes.push({ esVacio: true });
    }

    for (let i = 1; i <= diasEnElMes; i++) {
      const fechaActual = new Date(this.anioSeleccionado, this.mesSeleccionado - 1, i);
      const esFinDeSemana = fechaActual.getDay() === 0 || fechaActual.getDay() === 6;
      
      let estadoDia = 'sin-registro';
      let claseColor = 'bg-gris'; 

      if (!esFinDeSemana) {
        // SOLUCIÓN CLAVE 2: Parser universal de fechas que extrae el día sin importar el formato
        const registro = asistenciasBD.find(a => {
          if (!a.fecha) return false;
          const fechaSoloDia = a.fecha.toString().split('T')[0].split(' ')[0];
          const partes = fechaSoloDia.includes('-') ? fechaSoloDia.split('-') : fechaSoloDia.split('/');
          let dia = -1;
          if (partes.length >= 3) {
            if (partes[0].length === 4) dia = parseInt(partes[2], 10);
            else dia = parseInt(partes[0], 10);
          }
          return dia === i;
        });

        if (registro) {
          estadoDia = registro.estado.toLowerCase().trim();
          if (estadoDia === 'presente') { claseColor = 'bg-verde'; this.resumen.presente++; }
          else if (estadoDia === 'ausente') { claseColor = 'bg-rojo'; this.resumen.ausente++; }
          else if (estadoDia === 'atraso' || estadoDia === 'tardanza') { claseColor = 'bg-amarillo'; this.resumen.tardanza++; }
          else if (estadoDia === 'licencia') { claseColor = 'bg-azul'; this.resumen.licencia++; }
        } else {
           claseColor = 'bg-blanco'; 
        }
      }

      this.diasDelMes.push({
        esVacio: false,
        dia: i,
        esFinDeSemana: esFinDeSemana,
        clase: claseColor
      });
    }
  }
}