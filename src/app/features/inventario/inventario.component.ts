import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute } from '@angular/router';
import { InventarioService } from '../../core/services/inventario.service';

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

  // Estado CRUD
  showModal = false;
  isEditing = false;
  inventoryForm: FormGroup;
  isSaving = false;
  
  inventoryItems: InventoryItem[] = [];
  
  filteredItems: InventoryItem[] = [];
  showIncidenciasModal = false;
  selectedItem: InventoryItem | null = null;

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
          this.filteredItems = [...this.inventoryItems];
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar inventario:', error);
        this.toastService.show('Error al cargar datos del inventario', 'warning');
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
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredItems = this.inventoryItems.filter(item => 
      item.codigo.toLowerCase().includes(query) || 
      item.nombre.toLowerCase().includes(query) ||
      item.categoria.toLowerCase().includes(query)
    );
    this.paginaActual = 1; // Resetear a página 1 al buscar
  }

  // ==========================================
  // Métodos de navegación y gestión de estado
  // ==========================================

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
    this.showModal = true;
  }

  openEditModal(item: InventoryItem) {
    this.isEditing = true;
    this.inventoryForm.patchValue(item);
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveItem() {
    if (this.inventoryForm.invalid) return;
    
    this.isSaving = true;
    
    setTimeout(() => {
      if (this.isEditing) {
        const index = this.inventoryItems.findIndex(i => i.id === this.inventoryForm.value.id);
        if (index > -1) {
          this.inventoryItems[index] = { ...this.inventoryItems[index], ...this.inventoryForm.value };
        }
        this.toastService.show('Producto actualizado correctamente', 'success');
      } else {
        const newItem = {
          ...this.inventoryForm.value,
          id: String(Date.now()), // Temporary string ID until POST is connected
          incidencias: []
        };
        this.inventoryItems.push(newItem);
        this.toastService.show('Producto registrado correctamente', 'success');
      }
      
      this.isSaving = false;
      this.closeModal();
      this.filteredItems = [...this.inventoryItems];
      this.cdr.detectChanges();
    }, 1500);
  }

  deleteItem(id: string) {
    if (confirm('¿Está seguro de eliminar este producto del inventario?')) {
      this.inventoryItems = this.inventoryItems.filter(i => i.id !== id);
      this.filteredItems = [...this.inventoryItems];
      this.toastService.show('Producto eliminado del inventario.', 'warning');
    }
  }

  ajustarStock(item: InventoryItem, cantidad: number, event: Event) {
    const nuevoStock = Math.max(0, item.stock_disponible + cantidad);
    item.stock_disponible = nuevoStock;
    item.stock_total = item.stock_disponible + item.stock_reparacion + item.stock_baja;
    
    this.toastService.show(`Stock disponible actualizado: ${nuevoStock} unidades.`, 'info');
    
    // Feedback visual usando Web Animations API (100% confiable y sin conflictos con Angular)
    const target = event.target as HTMLElement;
    const tr = target.closest('tr');
    
    if (tr) {
      // Color aurora cian/azul para sumar (+), color ámbar/rojo sutil para restar (-)
      const flashColor = cantidad > 0 
        ? 'rgba(0, 217, 255, 0.25)' 
        : 'rgba(239, 68, 68, 0.25)';
        
      tr.animate([
        { backgroundColor: flashColor },
        { backgroundColor: 'transparent' }
      ], {
        duration: 800,
        easing: 'ease-out'
      });
    }
  }
}
