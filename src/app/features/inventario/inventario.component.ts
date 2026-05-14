import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute } from '@angular/router';
import { InventarioService, ArticuloInventario } from './inventario.service';

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
  private inventarioService = inject(InventarioService);

  // Tabs
  activeTab: 'stock' | 'gestion' = 'stock';

  // Estado CRUD
  showModal = false;
  isEditing = false;
  inventoryForm: FormGroup;
  isLoading = true;
  
  inventoryItems: ArticuloInventario[] = [];

  constructor() {
    this.inventoryForm = this.fb.group({
      codigo: ['', Validators.required],
      nombre: ['', Validators.required],
      categoria: ['', Validators.required],
      cantidad: [0, [Validators.required, Validators.min(0)]],
      stock_minimo: [5, [Validators.required, Validators.min(1)]],
      ubicacion: ['', Validators.required],
      estado: ['Disponible', Validators.required]
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const tab = params['tab'];
        if (['stock', 'gestion'].includes(tab)) {
          this.activeTab = tab as any;
        }
      }
    });

    this.cargarInventario();
  }

  cargarInventario() {
    this.isLoading = true;
    this.inventarioService.getInventario().subscribe({
      next: (response) => {
        if (response.success) {
          this.inventoryItems = response.data;
        } else {
          this.toastService.show(response.message || 'Error al cargar inventario', 'error');
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.toastService.show('Error de conexión con el servidor', 'error');
        this.isLoading = false;
        console.error(err);
      }
    });
  }
  
  getStatusColor(status: string): string {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'disponible') return 'status-available';
    if (statusLower === 'crítico' || statusLower === 'critico') return 'status-critical';
    if (statusLower === 'en reparación' || statusLower === 'en reparacion') return 'status-repair';
    return 'status-discontinued'; // default
  }
  
  getStatusLabel(status: string): string {
    return status || 'Desconocido';
  }
  
  getTotalItems(): number {
    return this.inventoryItems.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  }
  
  getItemsCount(): number {
    return this.inventoryItems.length;
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
      cantidad: 0,
      stock_minimo: 5,
      estado: 'Disponible'
    });
    this.showModal = true;
  }

  openEditModal(item: ArticuloInventario) {
    this.isEditing = true;
    this.inventoryForm.patchValue(item);
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveItem() {
    if (this.inventoryForm.invalid) {
      this.inventoryForm.markAllAsTouched();
      return;
    }

    const formValue = this.inventoryForm.value;
    
    // Estado calculado dinámicamente según nivel de stock
    if (formValue.cantidad <= formValue.stock_minimo) {
      formValue.estado = 'Crítico';
    } else if (formValue.cantidad > formValue.stock_minimo && formValue.estado === 'Crítico') {
      formValue.estado = 'Disponible';
    }

    // Pendiente: Integrar con backend POST/PUT (Tarea #14)
    if (this.isEditing) {
      const index = this.inventoryItems.findIndex(i => i.codigo === formValue.codigo);
      if (index !== -1) {
        this.inventoryItems[index] = { ...this.inventoryItems[index], ...formValue };
        this.toastService.show('Información del producto actualizada.', 'success');
      }
    } else {
      this.inventoryItems.unshift(formValue);
      this.toastService.show('Producto añadido al inventario.', 'success');
    }
    this.closeModal();
  }

  deleteItem(codigo: string) {
    if (confirm('¿Está seguro de eliminar este producto del inventario?')) {
      // Pendiente: Integrar con backend DELETE (Tarea #14)
      this.inventoryItems = this.inventoryItems.filter(i => i.codigo !== codigo);
      this.toastService.show('Producto eliminado del inventario.', 'warning');
    }
  }

  ajustarStock(item: ArticuloInventario, cantidadAjuste: number, event: Event) {
    const nuevoStock = Math.max(0, item.cantidad + cantidadAjuste);
    item.cantidad = nuevoStock;
    
    if (nuevoStock <= item.stock_minimo) {
      item.estado = 'Crítico';
    } else if (nuevoStock > item.stock_minimo && item.estado === 'Crítico') {
      item.estado = 'Disponible';
    }
    
    this.toastService.show(`Stock actualizado: ${nuevoStock} unidades.`, 'info');
    
    // Feedback visual usando Web Animations API
    const target = event.target as HTMLElement;
    const tr = target.closest('tr');
    
    if (tr) {
      const flashColor = cantidadAjuste > 0 
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
