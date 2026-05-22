import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute } from '@angular/router';

interface InventoryItem {
  id: number;
  codigo: string;
  producto: string;
  categoria: string;
  stock_total: number;
  stock_disponible: number;
  stock_reparacion: number;
  stock_baja: number;
  stock_minimo: number;
  ubicacion: string;
  costo_unitario: number;
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

  // Tabs
  activeTab: 'stock' | 'gestion' = 'stock';
  isLoading = true;

  // Estado CRUD
  showModal = false;
  isEditing = false;
  inventoryForm: FormGroup;
  isSaving = false;
  
  // TODO: Reemplazar con llamada al servicio de inventario (backend pendiente)
  inventoryItems: InventoryItem[] = [
    { id: 1,  codigo: 'ELM-001', producto: 'Taladro de Columna Industrial',  categoria: 'Electromecánica', ubicacion: 'Taller 1',        stock_total: 5,    stock_disponible: 4,   stock_reparacion: 1, stock_baja: 0,  stock_minimo: 1,  costo_unitario: 320000, incidencias: [{ fecha: '2026-04-05', tipo: 'Reparación', cantidad: 1, detalle: 'Motor trabado, en servicio técnico.' }] },
    { id: 2,  codigo: 'ELM-002', producto: 'Multímetro Digital Fluke',         categoria: 'Electromecánica', ubicacion: 'Taller 1',        stock_total: 15,   stock_disponible: 10,  stock_reparacion: 2, stock_baja: 3,  stock_minimo: 3,  costo_unitario: 45000,  incidencias: [{ fecha: '2026-03-20', tipo: 'Baja',      cantidad: 3, detalle: 'Quemados por sobretensión.'        }] },
    { id: 3,  codigo: 'ELM-003', producto: 'Soldador de Estaño 60W',            categoria: 'Electromecánica', ubicacion: 'Taller 1',        stock_total: 10,   stock_disponible: 8,   stock_reparacion: 2, stock_baja: 0,  stock_minimo: 2,  costo_unitario: 18000,  incidencias: [] },
    { id: 4,  codigo: 'ELM-004', producto: 'Motor Eléctrico Trifásico 1HP',     categoria: 'Electromecánica', ubicacion: 'Bodega Central',  stock_total: 4,    stock_disponible: 2,   stock_reparacion: 2, stock_baja: 0,  stock_minimo: 1,  costo_unitario: 185000, incidencias: [{ fecha: '2026-04-10', tipo: 'Reparación', cantidad: 2, detalle: 'Bobinado dañado por alumnos de 3ro Medio.' }] },
    { id: 5,  codigo: 'INF-001', producto: 'Notebook HP ProBook 450 G9',       categoria: 'Informática',     ubicacion: 'Laboratorio 1',  stock_total: 30,   stock_disponible: 25,  stock_reparacion: 4, stock_baja: 1,  stock_minimo: 5,  costo_unitario: 620000, incidencias: [{ fecha: '2026-04-02', tipo: 'Reparación', cantidad: 4, detalle: 'Pantallas quebradas.' }] },
    { id: 6,  codigo: 'INF-002', producto: 'Switch Cisco 24 Puertos',          categoria: 'Informática',     ubicacion: 'Sala Servidores',stock_total: 3,    stock_disponible: 2,   stock_reparacion: 0, stock_baja: 1,  stock_minimo: 1,  costo_unitario: 280000, incidencias: [] },
    { id: 7,  codigo: 'INF-003', producto: 'Cable UTP Cat6 (rollo 305m)',      categoria: 'Informática',     ubicacion: 'Bodega Central',  stock_total: 5,    stock_disponible: 4,   stock_reparacion: 0, stock_baja: 1,  stock_minimo: 2,  costo_unitario: 42000,  incidencias: [] },
    { id: 8,  codigo: 'INS-001', producto: 'Resma Papel A4 (500 hojas)',       categoria: 'Papelería',       ubicacion: 'Bodega Central',  stock_total: 50,   stock_disponible: 40,  stock_reparacion: 0, stock_baja: 10, stock_minimo: 10, costo_unitario: 4500,   incidencias: [] },
    { id: 9,  codigo: 'INS-002', producto: 'Tóner Impresora HP LaserJet',      categoria: 'Papelería',       ubicacion: 'Bodega Central',  stock_total: 5,    stock_disponible: 3,   stock_reparacion: 0, stock_baja: 2,  stock_minimo: 2,  costo_unitario: 38000,  incidencias: [] },
    { id: 10, codigo: 'INS-003', producto: 'Proyector Epson EB-E01',           categoria: 'Audiovisual',     ubicacion: 'Sala Profesores', stock_total: 6,    stock_disponible: 5,   stock_reparacion: 1, stock_baja: 0,  stock_minimo: 2,  costo_unitario: 185000, incidencias: [{ fecha: '2026-04-12', tipo: 'Reparación', cantidad: 1, detalle: 'Lámpara fundida.' }] },
    { id: 11, codigo: 'INS-004', producto: 'Silla Universitaria',              categoria: 'Mobiliario',      ubicacion: 'Bodegas Salas',   stock_total: 1000, stock_disponible: 950, stock_reparacion: 40,stock_baja: 10, stock_minimo: 50, costo_unitario: 25000,  incidencias: [{ fecha: '2026-04-15', tipo: 'Reparación', cantidad: 40, detalle: 'Estructuras desoldadas.' }] }
  ];
  
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
      producto: ['', Validators.required],
      categoria: ['', Validators.required],
      stock_total: [0, [Validators.required, Validators.min(0)]],
      stock_disponible: [0, [Validators.required, Validators.min(0)]],
      stock_reparacion: [0, [Validators.required, Validators.min(0)]],
      stock_baja: [0, [Validators.required, Validators.min(0)]],
      stock_minimo: [5, [Validators.required, Validators.min(1)]],
      ubicacion: ['', Validators.required],
      costo_unitario: [0, Validators.required]
    });
  }

  ngOnInit() {
    setTimeout(() => {
      this.isLoading = false;
      this.cdr.detectChanges();
    }, 1000);

    this.filteredItems = [...this.inventoryItems];
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
      item.producto.toLowerCase().includes(query) ||
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
          id: Math.max(...this.inventoryItems.map(i => i.id)) + 1,
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

  deleteItem(id: number) {
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
