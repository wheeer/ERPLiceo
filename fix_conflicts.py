import re

filepath = r"c:\Users\Jordan\OneDrive\Escritorio\ERPLiceo\src\app\features\rrhh\rrhh.component.ts"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Chunk 1
content = re.sub(r'<<<<<<< HEAD\n  // Dependencias\n=======\n  // ==========================================\n  // DEPENDENCIAS \(Unificadas al estilo moderno\)\n  // ==========================================\n>>>>>>> origin/main', 
                 r'  // ==========================================\n  // DEPENDENCIAS (Unificadas al estilo moderno)\n  // ==========================================', content)

# Chunk 2
content = re.sub(r'<<<<<<< HEAD\n  mostrarSoloActivos: boolean = false; // <-- Nuevo estado para el filtro\n\n  // Estado Asistencia Diaria\n=======\n  mostrarSoloActivos: boolean = false;\n\n>>>>>>> origin/main', 
                 r'  mostrarSoloActivos: boolean = false;\n', content)

# Chunk 3
content = re.sub(r'<<<<<<< HEAD\n  asistenciaList: any\[\] = \[\n=======\n  asistenciaList: AsistenciaEmpleado\[\] = \[\n>>>>>>> origin/main', 
                 r'  asistenciaList: AsistenciaEmpleado[] = [', content)

# Chunk 4
content = re.sub(r'<<<<<<< HEAD\n\n  getRiskLevel.*?// El arreglo se inicializa vacío, se llenará con Mongo\n=======\n\n>>>>>>> origin/main', 
                 r'\n', content, flags=re.DOTALL)

# Chunk 5
content = re.sub(r'<<<<<<< HEAD\n    this\.excepcionForm\.get\(\'horaEntradaReal\'\)\?\.valueChanges\.subscribe\(hora => {\n      if \(hora && this\.excepcionForm\.get\(\'tipoExcepcion\'\)\?\.value === \'atraso\'\) {\n=======\n    this\.excepcionForm\.get\(\'horaEntradaReal\'\)\?\.valueChanges\.subscribe\(\(hora: string \| null\) => {\n      const tipoExcepcionActual = this\.excepcionForm\.get\(\'tipoExcepcion\'\)\?\.value \|\| \'\';\n      if \(hora && tipoExcepcionActual === \'atraso\'\) {\n>>>>>>> origin/main', 
                 r'    this.excepcionForm.get(\'horaEntradaReal\')?.valueChanges.subscribe((hora: string | null) => {\n      const tipoExcepcionActual = this.excepcionForm.get(\'tipoExcepcion\')?.value || \'\';\n      if (hora && tipoExcepcionActual === \'atraso\') {', content)

# Chunk 6
chunk6_repl = r"""  obtenerAsistencia(): void {
    let url = `http://127.0.0.1:8000/api/asistencia/${this.mesSeleccionado}/${this.anioSeleccionado}/`;

    if (this.empleadoSeleccionado) {
      url += `?empleadoId=${this.empleadoSeleccionado}`;
    }

    this.http.get<{ success: boolean, data: {empleados: EmpleadoCalendario[], asistencia: AsistenciaDia[]}, message: string }>(url).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.empleadosCalendario = response.data.empleados || [];
          this.asistenciaMensual = response.data.asistencia || [];

          if (!this.empleadoSeleccionado && this.empleadosCalendario.length > 0) {
            this.empleadoSeleccionado = this.empleadosCalendario[0].rut;
            this.obtenerAsistencia();
            return;
          }

          this.calcularTotales();
          this.generarCalendario();
          this.cdr.detectChanges();
        }
      },
      error: (error: any) => {
        console.error('Error al obtener la asistencia del calendario:', error);
      }
    });
  }

  calcularTotales(): void {
    this.totalPresentes = 0;
    this.totalAusentes = 0;
    this.totalTardanzas = 0;
    this.totalLicencias = 0;

    this.asistenciaMensual.forEach(dia => {
      const estado = dia.estado ? dia.estado.toLowerCase() : '';

      if (!estado || estado === 'sin registro' || estado === 'finde') return;

      if (estado.includes('presente')) {
        this.totalPresentes++;
      } else if (estado.includes('ausente')) {
        this.totalAusentes++;
      } else if (estado.includes('atraso') || estado.includes('tardanza')) {
        this.totalTardanzas++;
      } else if (estado.includes('licencia')) {
        this.totalLicencias++;
      }
    });
  }

  generarCalendario(): void {
    this.diasCalendario = [];
    if (this.asistenciaMensual.length === 0) return;

    const primerDiaFecha = new Date(this.anioSeleccionado, this.mesSeleccionado - 1, 1);
    let diaSemana = primerDiaFecha.getDay();

    diaSemana = diaSemana === 0 ? 6 : diaSemana - 1;

    for (let i = 0; i < diaSemana; i++) {
      this.diasCalendario.push({ vacio: true });
    }

    this.asistenciaMensual.forEach(dia => {
      const partesFecha = dia.fecha.split('-');
      const numeroDia = parseInt(partesFecha[2], 10);

      const fechaObj = new Date(this.anioSeleccionado, this.mesSeleccionado - 1, numeroDia);
      const esFinde = fechaObj.getDay() === 0 || fechaObj.getDay() === 6;

      this.diasCalendario.push({
        vacio: false,
        numero: numeroDia,
        fechaCompleta: dia.fecha,
        estado: esFinde ? 'Finde' : dia.estado
      });
    });
  }

  // ==========================================
  // LÓGICA ANTIGUA (CRUD y Tablas) MANTENIDA INTACTA
  // ==========================================
"""
content = re.sub(r'<<<<<<< HEAD\n=======\n  obtenerAsistencia\(\): void \{.*?// LÓGICA ANTIGUA \(CRUD y Tablas\) MANTENIDA INTACTA\n  // ==========================================\n\n>>>>>>> origin/main', chunk6_repl, content, flags=re.DOTALL)

# Chunk 7
content = re.sub(r'<<<<<<< HEAD\n  // ==========================================\n  // Resto de la lógica intacta\.\.\.\n  // ==========================================\n=======\n  getRiskLevel.*?>>>>>>> origin/main', 
                 r'  getRiskLevel(inasistencias: number): \'ok\' | \'warning\' | \'danger\' {\n    if (inasistencias >= 3) return \'danger\';\n    if (inasistencias >= 1) return \'warning\';\n    return \'ok\';\n  }\n', content, flags=re.DOTALL)

# Chunk 8
content = re.sub(r'<<<<<<< HEAD\n  changeTab\(tab: \'general\' \| \'gestion\' \| \'ficha\' \| \'asistencia\' \| \'horasExtra\'\) {\n=======\n  changeTab\(tab: TabType\) {\n>>>>>>> origin/main', 
                 r'  changeTab(tab: TabType) {', content)

# Chunk 9
content = re.sub(r'<<<<<<< HEAD\n      emp\.estado = estadosMap\[tipo\];\n=======\n      emp\.estado = estadosMap\[tipo\] \|\| emp\.estado;\n>>>>>>> origin/main', 
                 r'      emp.estado = estadosMap[tipo] || emp.estado;', content)


with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
