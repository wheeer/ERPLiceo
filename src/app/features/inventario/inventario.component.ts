import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute } from '@angular/router';

interface InventoryItem {
  id: number;
  codigo: string;
  producto: string;
  categoria: string;
  stock: number;
  stockCritico: number;
  ubicacion: string;
  estado: 'disponible' | 'bajo-stock' | 'descontinuado';
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

  // Tabs
  activeTab: 'stock' | 'gestion' = 'stock';

  // Estado CRUD
  showModal = false;
  isEditing = false;
  inventoryForm: FormGroup;
  
  // TODO: Reemplazar con llamada al servicio de inventario (backend pendiente)
  inventoryItems: InventoryItem[] = [
    {
      id: 1,
      codigo: 'MON-001',
      producto: 'Monitor Dell 24 pulgadas FHD',
      categoria: 'Hardware',
      stock: 12,
      stockCritico: 5,
      ubicacion: 'Bodega A - Estante 1',
      estado: 'disponible'
    },
    {
      id: 2,
      codigo: 'KEY-002',
      producto: 'Teclado Mecánico RGB',
      categoria: 'Perifericos',
      stock: 3,
      stockCritico: 5,
      ubicacion: 'Bodega B - Estante 3',
      estado: 'bajo-stock'
    },
    {
      id: 3,
      codigo: 'RAM-003',
      producto: 'Memoria RAM DDR4 8GB',
      categoria: 'Componentes',
      stock: 25,
      stockCritico: 10,
      ubicacion: 'Bodega A - Estante 2',
      estado: 'disponible'
    },
    {
      id: 4,
      codigo: 'SSD-004',
      producto: 'SSD Samsung 256GB NVMe',
      categoria: 'Almacenamiento',
      stock: 0,
      stockCritico: 2,
      ubicacion: 'Bodega C - Estante 1',
      estado: 'descontinuado'
    },
    {
      id: 5,
      codigo: 'MOU-005',
      producto: 'Mouse Láser inalámbrico',
      categoria: 'Perifericos',
      stock: 18,
      stockCritico: 5,
      ubicacion: 'Bodega B - Estante 2',
      estado: 'disponible'
    },
    {
      id: 6,
      codigo: 'USH-006',
      producto: 'Hub USB 7 puertos',
      categoria: 'Accesorios',
      stock: 8,
      stockCritico: 3,
      ubicacion: 'Bodega A - Estante 4',
      estado: 'disponible'
    },
    {
      id: 7,
      codigo: 'CAB-007',
      producto: 'Cable HDMI Premium 2m',
      categoria: 'Cableria',
      stock: 42,
      stockCritico: 15,
      ubicacion: 'Bodega D - Estante 1',
      estado: 'disponible'
    },
    {
      id: 8,
      codigo: 'PRJ-008',
      producto: 'Proyector Epson 3000 lúmenes',
      categoria: 'Audiovisual',
      stock: 2,
      stockCritico: 3,
      ubicacion: 'Bodega C - Estante 3',
      estado: 'bajo-stock'
    },
    {
      id: 9,
      codigo: 'PAN-009',
      producto: 'Pantalla Interactiva 65"',
      categoria: 'Audiovisual',
      stock: 5,
      stockCritico: 2,
      ubicacion: 'Bodega C - Estante 2',
      estado: 'disponible'
    },
    {
      id: 10,
      codigo: 'PSU-010',
      producto: 'Fuente de Poder 550W 80+',
      categoria: 'Componentes',
      stock: 1,
      stockCritico: 3,
      ubicacion: 'Bodega A - Estante 3',
      estado: 'bajo-stock'
    }
  ];

  constructor() {
    this.inventoryForm = this.fb.group({
      id: [null],
      codigo: ['', Validators.required],
      producto: ['', Validators.required],
      categoria: ['', Validators.required],
      stock: [0, [Validators.required, Validators.min(0)]],
      stockCritico: [5, [Validators.required, Validators.min(1)]],
      ubicacion: ['', Validators.required],
      estado: ['disponible', Validators.required]
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
  }
  
  getStatusColor(status: InventoryItem['estado']): string {
    const colors: Record<InventoryItem['estado'], string> = {
      'disponible': 'status-available',
      'bajo-stock': 'status-lowstock',
      'descontinuado': 'status-discontinued'
    };
    return colors[status];
  }
  
  getStatusLabel(status: InventoryItem['estado']): string {
    const labels: Record<InventoryItem['estado'], string> = {
      'disponible': 'Disponible',
      'bajo-stock': 'Bajo Stock',
      'descontinuado': 'Descontinuado'
    };
    return labels[status];
  }
  
  getTotalItems(): number {
    return this.inventoryItems.reduce((sum, item) => sum + item.stock, 0);
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
      stock: 0,
      stockCritico: 5,
      estado: 'disponible'
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
    if (this.inventoryForm.invalid) {
      this.inventoryForm.markAllAsTouched();
      return;
    }

    const formValue = this.inventoryForm.value;
    
    // Estado calculado dinámicamente según nivel de stock
    if (formValue.stock === 0 && formValue.estado !== 'descontinuado') {
      formValue.estado = 'bajo-stock';
    } else if (formValue.stock <= formValue.stockCritico && formValue.estado === 'disponible') {
      formValue.estado = 'bajo-stock';
    } else if (formValue.stock > formValue.stockCritico && formValue.estado === 'bajo-stock') {
      formValue.estado = 'disponible';
    }

    if (this.isEditing) {
      const index = this.inventoryItems.findIndex(i => i.id === formValue.id);
      if (index !== -1) {
        this.inventoryItems[index] = formValue;
        this.toastService.show('Información del producto actualizada.', 'success');
      }
    } else {
      formValue.id = Math.max(0, ...this.inventoryItems.map(i => i.id)) + 1;
      this.inventoryItems.unshift(formValue);
      this.toastService.show('Producto añadido al inventario.', 'success');
    }
    this.closeModal();
  }

  deleteItem(id: number) {
    if (confirm('¿Está seguro de eliminar este producto del inventario?')) {
      this.inventoryItems = this.inventoryItems.filter(i => i.id !== id);
      this.toastService.show('Producto eliminado del inventario.', 'warning');
    }
  }

  ajustarStock(item: InventoryItem, cantidad: number, event: Event) {
    const nuevoStock = Math.max(0, item.stock + cantidad);
    item.stock = nuevoStock;
    
    if (nuevoStock === 0 && item.estado !== 'descontinuado') {
      item.estado = 'bajo-stock';
    } else if (nuevoStock <= item.stockCritico && item.estado === 'disponible') {
      item.estado = 'bajo-stock';
    } else if (nuevoStock > item.stockCritico && item.estado === 'bajo-stock') {
      item.estado = 'disponible';
    }
    
    this.toastService.show(`Stock actualizado: ${nuevoStock} unidades.`, 'info');
    
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
