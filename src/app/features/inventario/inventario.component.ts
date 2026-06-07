import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute } from '@angular/router';
import { InventarioService } from '../../core/services/inventario.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InventoryItem {
  id: string; // Updated from number to string for ObjectId
  codigo: string;
  nombre: string;
  categoria: string;
  stock_total: number;
  stock_disponible: number;
  stock_reparacion: number;
  stock_baja: number;
  stock_minimo: number;
  ubicacion: string;
  costo_unitario: number;
  estado: string;
  ultimo_mantenimiento: string | null;
  incidencias: { fecha: string; tipo: string; cantidad: number; detalle: string; }[];
}

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.css']
})
export class InventarioComponent implements OnInit {
  
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private inventarioService = inject(InventarioService);

  // Tabs
  activeTab: 'stock' | 'gestion' = 'stock';
  isLoading = true;
  isGeneratingPDF = false;

  // Estado CRUD
  showModal = false;
  isEditing = false;
  inventoryForm: FormGroup;
  isSaving = false;
  private previousFormValues: any = null;
  
  // Modales Asíncronos
  showBajaModal = false;
  showReparacionModal = false;
  showDeleteModal = false;
  showSaveModal = false;
  
  isSkuModified = false;
  originalSku: string | null = null;
  pendingDiff = 0;
  pendingDeleteId: string | null = null;
  isModalUpdating = false;
  
  inventoryItems: InventoryItem[] = [];
  
  filteredItems: InventoryItem[] = [];
  showIncidenciasModal = false;
  selectedItem: InventoryItem | null = null;
  
  // Filtros
  verSoloCriticos = false;
  currentSearchQuery = '';

  // ==========================================
  // PAGINACIÓN
  // ==========================================
  paginaActual = 1;
  itemsPorPagina = 5; // Cambiado a 5 temporalmente para poder probar la paginación con los 11 datos falsos
  opcionesPorPagina = [5, 10, 20, 50, 100];

  get itemsPaginados(): InventoryItem[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.filteredItems.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.filteredItems.length / this.itemsPorPagina);
  }

  get rangoMostrado(): string {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina + 1;
    const fin = Math.min(this.paginaActual * this.itemsPorPagina, this.filteredItems.length);
    return `${inicio}-${fin} de ${this.filteredItems.length}`;
  }

  paginaAnterior() {
    if (this.paginaActual > 1) this.paginaActual--;
  }

  siguientePagina() {
    if (this.paginaActual < this.totalPaginas) this.paginaActual++;
  }

  cambiarItemsPorPagina(event: Event) {
    this.itemsPorPagina = Number((event.target as HTMLSelectElement).value);
    this.paginaActual = 1;
  }
  
  openIncidenciasModal(item: InventoryItem) {
    this.selectedItem = item;
    this.showIncidenciasModal = true;
  }
  
  closeIncidenciasModal() {
    this.showIncidenciasModal = false;
    this.selectedItem = null;
  }
  
  getStockStatus(item: InventoryItem): 'ok' | 'warning' | 'critical' {
    if (item.stock_disponible <= 0) return 'critical';
    if (item.stock_disponible <= item.stock_minimo) return 'warning';
    return 'ok';
  }

  constructor() {
    this.inventoryForm = this.fb.group({
      id: [null],
      codigo: ['', Validators.required],
      nombre: ['', Validators.required],
      categoria: ['', Validators.required],
      stock_total: [0, [Validators.required, Validators.min(0)]],
      stock_disponible: [0, [Validators.required, Validators.min(0)]],
      stock_reparacion: [0, [Validators.required, Validators.min(0)]],
      stock_baja: [0, [Validators.required, Validators.min(0)]],
      stock_minimo: [5, [Validators.required, Validators.min(1)]],
      ubicacion: ['', Validators.required],
      costo_unitario: [0, Validators.required],
      ultimo_mantenimiento: [null]
    });
  }

  ngOnInit() {
    // Auto-calcular el stock total y gestionar lógica de procedencia (Prevención de Errores)
    this.inventoryForm.valueChanges.subscribe(values => {
      if (!this.previousFormValues || !this.showModal || this.isModalUpdating) return;

      let disp = values.stock_disponible || 0;
      let rep = values.stock_reparacion || 0;
      let baja = values.stock_baja || 0;

      const prevDisp = this.previousFormValues.stock_disponible || 0;
      const prevRep = this.previousFormValues.stock_reparacion || 0;
      const prevBaja = this.previousFormValues.stock_baja || 0;

      let needsUpdate = false;

      // 1. Si aumentó reparación (asumimos que viene de disponible)
      if (rep > prevRep) {
        const diff = rep - prevRep;
        if (diff > prevDisp) {
          this.toastService.show('No hay suficiente stock disponible para enviar a reparación', 'error');
          rep = prevRep + prevDisp;
          disp = 0;
        } else {
          disp = disp - diff;
        }
        needsUpdate = true;
      }
      // 2. Si bajó reparación (preguntar destino)
      else if (rep < prevRep) {
        this.pendingDiff = prevRep - rep;
        this.showReparacionModal = true;
        
        // Revertir visualmente mientras el modal está abierto
        this.isModalUpdating = true;
        this.inventoryForm.patchValue({ stock_reparacion: prevRep }, { emitEvent: false });
        this.isModalUpdating = false;
        return;
      }
      // 3. Si aumentó baja (y no fue por el paso 2)
      else if (baja > prevBaja && !needsUpdate) {
        const diff = baja - prevBaja;
        const maxBajaPosible = prevDisp + prevRep;
        
        if (diff > maxBajaPosible) {
          this.toastService.show('No hay suficiente stock en el sistema para dar de baja', 'error');
          baja = prevBaja + maxBajaPosible;
          this.pendingDiff = maxBajaPosible;
          needsUpdate = true;
        } else {
          this.pendingDiff = diff;
        }
        
        if (this.pendingDiff > 0) {
          this.showBajaModal = true;
          // Revertir visualmente mientras el modal está abierto
          this.isModalUpdating = true;
          this.inventoryForm.patchValue({ stock_baja: prevBaja }, { emitEvent: false });
          this.isModalUpdating = false;
          return;
        }
      }

      // Habilitar/deshabilitar fecha de último mantenimiento según stock de reparación
      this.updateMantenimientoState(rep);

      const total = disp + rep + baja;

      // Actualizar variables de control primero para evitar recursividad
      this.previousFormValues = {
        ...values,
        stock_disponible: disp,
        stock_reparacion: rep,
        stock_baja: baja,
        stock_total: total
      };

      if (needsUpdate || values.stock_total !== total || values.stock_disponible !== disp || values.stock_baja !== baja || values.stock_reparacion !== rep) {
        this.isModalUpdating = true;
        this.inventoryForm.patchValue({
          stock_disponible: disp,
          stock_reparacion: rep,
          stock_baja: baja,
          stock_total: total
        }, { emitEvent: false });
        this.isModalUpdating = false;
      }
    });

    this.isLoading = true;
    this.inventarioService.getInventario().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.inventoryItems = response.data.map((item: any) => ({
            id: item._id, // Mongo id mapping
            codigo: item.codigo,
            nombre: item.nombre, 
            categoria: item.categoria,
            stock_total: (item.stock_disponible || 0) + (item.stock_reparacion || 0) + (item.stock_baja || 0),
            stock_disponible: item.stock_disponible || 0,
            stock_reparacion: item.stock_reparacion || 0,
            stock_baja: item.stock_baja || 0,
            stock_minimo: item.stock_minimo || 0,
            ubicacion: item.ubicacion,
            costo_unitario: item.costo_unitario || 0,
            estado: item.estado,
            ultimo_mantenimiento: item.ultimo_mantenimiento || null,
            incidencias: item.incidencias || []
          }));
          this.aplicarFiltros();
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar inventario:', error);
        console.log('Error al cargar datos del inventario');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const tab = params['tab'];
        if (['stock', 'gestion'].includes(tab)) {
          this.activeTab = tab as any;
        }
      }
    });
  }
  

  
  getTotalItems(): number {
    return this.filteredItems.reduce((sum, item) => sum + item.stock_total, 0);
  }
  
  getItemsCount(): number {
    return this.filteredItems.length;
  }
  
  getTotalDisponible(): number {
    return this.filteredItems.reduce((s, i) => s + i.stock_disponible, 0);
  }
  
  onSearch(event: Event) {
    this.currentSearchQuery = (event.target as HTMLInputElement).value.toLowerCase();
    this.aplicarFiltros();
  }

  toggleCriticos() {
    this.verSoloCriticos = !this.verSoloCriticos;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let filtrados = this.inventoryItems;
    
    if (this.currentSearchQuery) {
      filtrados = filtrados.filter(item => 
        item.codigo.toLowerCase().includes(this.currentSearchQuery) || 
        item.nombre.toLowerCase().includes(this.currentSearchQuery) ||
        item.categoria.toLowerCase().includes(this.currentSearchQuery)
      );
    }

    if (this.verSoloCriticos) {
      filtrados = filtrados.filter(item => item.stock_disponible <= item.stock_minimo || item.estado === 'Crítico');
    }

    this.filteredItems = filtrados;
    this.paginaActual = 1; // Resetear a página 1 al filtrar
  }

  generarReportePDF() {
    this.isGeneratingPDF = true;
    this.inventarioService.getArticulosCriticos().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.crearPDF(response.data);
        } else {
          console.log('Error al obtener datos para el reporte');
          this.isGeneratingPDF = false;
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error obteniendo críticos para PDF:', error);
        console.log('Error de conexión al generar reporte');
        this.isGeneratingPDF = false;
        this.cdr.detectChanges();
      }
    });
  }

  private crearPDF(articulos: any[]) {
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text('Reporte de Artículos Críticos - ERPLiceo', 14, 22);
      
      // Subtítulo / Fecha
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      const fechaActual = new Date().toLocaleDateString('es-CL', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      doc.text(`Fecha de emisión: ${fechaActual}`, 14, 30);

      // Tabla
      const bodyData = articulos.map(item => [
        item.codigo,
        item.nombre,
        item.categoria,
        `${item.stock_disponible} / ${item.stock_minimo}`,
        item.estado === 'Crítico' || item.stock_disponible <= item.stock_minimo ? 'Crítico' : 'Advertencia',
        this.formatFecha(item.ultimo_mantenimiento),
        item.ubicacion
      ]);

      autoTable(doc, {
        startY: 35,
        head: [['Código', 'Nombre', 'Categoría', 'Stock (Disp/Mín)', 'Estado', 'Últ. Mant.', 'Ubicación']],
        body: bodyData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }, // Azul primario
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold' },
          3: { halign: 'center' },
          4: { fontStyle: 'bold', textColor: [220, 38, 38] }
        }
      });

      doc.save('reporte_articulos_criticos.pdf');
      console.log('Reporte descargado exitosamente');
    } catch (e) {
      console.error('Error generando PDF:', e);
      console.log('Hubo un problema al crear el archivo PDF');
    } finally {
      this.isGeneratingPDF = false;
      this.cdr.detectChanges();
    }
  }

  formatFecha(dateString: string | null): string {
    if (!dateString) return 'Sin registro';
    
    // Si es formato ISO fecha corta (ej: 2026-02-10) parsearlo manualmente para evitar problemas de zona horaria local
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
      const parts = dateString.trim().split('-');
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Sin registro';
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  }

  // ==========================================
  // Métodos de navegación y gestión de estado
  // ==========================================

  get todayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private updateMantenimientoState(repStock: number) {
    const umControl = this.inventoryForm.get('ultimo_mantenimiento');
    if (!umControl) return;
    if (repStock > 0) {
      if (umControl.disabled) umControl.enable({ emitEvent: false });
    } else {
      if (umControl.enabled) umControl.disable({ emitEvent: false });
    }
  }

  changeTab(tab: 'stock' | 'gestion') {
    this.activeTab = tab;
  }

  openNewModal() {
    this.isEditing = false;
    this.inventoryForm.reset({
      stock_total: 0,
      stock_disponible: 0,
      stock_reparacion: 0,
      stock_baja: 0,
      stock_minimo: 5,
      costo_unitario: 0
    });
    this.previousFormValues = this.inventoryForm.getRawValue();
    this.updateMantenimientoState(0);
    this.showModal = true;
  }

  openEditModal(item: InventoryItem) {
    this.isEditing = true;
    this.inventoryForm.patchValue(item);
    this.previousFormValues = this.inventoryForm.getRawValue();
    this.originalSku = item.codigo;
    this.updateMantenimientoState(item.stock_reparacion || 0);
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.previousFormValues = null;
    this.originalSku = null;
  }

  saveItem() {
    if (this.inventoryForm.invalid) return;
    
    if (this.isEditing && this.originalSku) {
      this.isSkuModified = this.inventoryForm.value.codigo !== this.originalSku;
    } else {
      this.isSkuModified = false;
    }
    
    this.showSaveModal = true;
  }

  executeSave() {
    this.showSaveModal = false;
    this.isSaving = true;
    const formData = this.inventoryForm.getRawValue();
    
    if (this.isEditing) {
      this.inventarioService.actualizarArticulo(formData.codigo, formData).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const index = this.inventoryItems.findIndex(i => i.id === formData.id);
            if (index > -1) {
              // Actualizar con datos del backend, asegurando el id
              this.inventoryItems[index] = { ...this.inventoryItems[index], ...response.data, id: response.data._id || formData.id };
            }
            this.isSaving = false;
            this.isSaving = false;
            this.closeModal();
            this.aplicarFiltros();
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error('Error actualizando:', error);
          this.isSaving = false;
          this.isSaving = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.inventarioService.crearArticulo(formData).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const newItem = {
              ...response.data,
              id: response.data._id || response.data.id || String(Date.now())
            };
            this.inventoryItems.push(newItem);
            this.isSaving = false;
            this.closeModal();
            this.aplicarFiltros();
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error('Error creando:', error);
          this.isSaving = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  cancelSave() {
    this.showSaveModal = false;
  }

  confirmDelete(id: string) {
    this.pendingDeleteId = id;
    this.showDeleteModal = true;
  }

  executeDelete() {
    this.showDeleteModal = false;
    if (!this.pendingDeleteId) return;
    
    const id = this.pendingDeleteId;
    const itemToDelete = this.inventoryItems.find(i => i.id === id);
    if (itemToDelete) {
      this.inventarioService.eliminarArticulo(itemToDelete.codigo).subscribe({
        next: (response) => {
          if (response.success) {
            this.inventoryItems = this.inventoryItems.filter(i => i.id !== id);
            this.aplicarFiltros();
            this.aplicarFiltros();
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error('Error eliminando:', error);
          console.error('Error eliminando producto:', error);
          this.cdr.detectChanges();
        }
      });
    }
    this.pendingDeleteId = null;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.pendingDeleteId = null;
  }

  // Lógica para aplicar los cambios del Modal Asíncrono de Baja
  confirmarBaja(origen: 'disponible' | 'reparacion') {
    this.showBajaModal = false;
    if (this.pendingDiff <= 0) return;
    
    this.isModalUpdating = true;
    
    const currentValues = this.inventoryForm.getRawValue();
    let disp = currentValues.stock_disponible;
    let rep = currentValues.stock_reparacion;
    let baja = currentValues.stock_baja;
    
    if (origen === 'reparacion' && this.pendingDiff > rep) {
      this.toastService.show('No hay suficientes unidades en reparación', 'error');
      this.isModalUpdating = false;
      this.pendingDiff = 0;
      return;
    } else if (origen === 'disponible' && this.pendingDiff > disp) {
      this.toastService.show('No hay suficientes unidades disponibles', 'error');
      this.isModalUpdating = false;
      this.pendingDiff = 0;
      return;
    }
    
    baja += this.pendingDiff;
    
    if (origen === 'reparacion') {
      rep = Math.max(0, rep - this.pendingDiff);
    } else {
      disp = Math.max(0, disp - this.pendingDiff);
    }
    
    const total = disp + rep + baja;
    
    this.previousFormValues = {
      ...currentValues,
      stock_disponible: disp,
      stock_reparacion: rep,
      stock_baja: baja,
      stock_total: total
    };
    
    this.inventoryForm.patchValue({
      stock_disponible: disp,
      stock_reparacion: rep,
      stock_baja: baja,
      stock_total: total
    }, { emitEvent: false });
    
    this.isModalUpdating = false;
    this.pendingDiff = 0;
  }

  cancelarBaja() {
    this.showBajaModal = false;
    this.pendingDiff = 0;
  }

  // Lógica para aplicar los cambios del Modal Asíncrono de Quitar Reparación
  confirmarQuitarReparacion(destino: 'disponible' | 'baja') {
    this.showReparacionModal = false;
    if (this.pendingDiff <= 0) return;
    
    this.isModalUpdating = true;
    
    const currentValues = this.inventoryForm.getRawValue();
    let disp = currentValues.stock_disponible;
    let rep = currentValues.stock_reparacion;
    let baja = currentValues.stock_baja;
    
    rep = Math.max(0, rep - this.pendingDiff);
    
    if (destino === 'baja') {
      baja += this.pendingDiff;
    } else {
      disp += this.pendingDiff;
    }
    
    const total = disp + rep + baja;
    
    this.previousFormValues = {
      ...currentValues,
      stock_disponible: disp,
      stock_reparacion: rep,
      stock_baja: baja,
      stock_total: total
    };
    
    this.inventoryForm.patchValue({
      stock_disponible: disp,
      stock_reparacion: rep,
      stock_baja: baja,
      stock_total: total
    }, { emitEvent: false });
    
    this.isModalUpdating = false;
    this.pendingDiff = 0;
  }

  cancelarQuitarReparacion() {
    this.showReparacionModal = false;
    this.pendingDiff = 0;
  }

  // Método para ajustar stock disponible con botones en el formulario
  adjustAvailableStock(amount: number) {
    if (this.inventoryForm.disabled || this.isSaving) return;
    
    const current = this.inventoryForm.getRawValue().stock_disponible || 0;
    const nuevoStock = Math.max(0, current + amount);
    
    if (nuevoStock !== current) {
      // Al cambiar el valor, valueChanges se encargará de recalcular stock_total automáticamente
      this.inventoryForm.patchValue({ stock_disponible: nuevoStock });
    }
  }
}
