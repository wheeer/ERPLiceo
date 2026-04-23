import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface InventoryItem {
  id: number;
  codigo: string;
  producto: string;
  categoria: string;
  stock: number;
  ubicacion: string;
  estado: 'disponible' | 'bajo-stock' | 'descontinuado';
}

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.css']
})
export class InventarioComponent {
  
  // Mock: 10 items de inventario
  inventoryItems: InventoryItem[] = [
    {
      id: 1,
      codigo: 'MON-001',
      producto: 'Monitor Dell 24 pulgadas FHD',
      categoria: 'Hardware',
      stock: 12,
      ubicacion: 'Bodega A - Estante 1',
      estado: 'disponible'
    },
    {
      id: 2,
      codigo: 'KEY-002',
      producto: 'Teclado Mecánico RGB',
      categoria: 'Perifericos',
      stock: 3,
      ubicacion: 'Bodega B - Estante 3',
      estado: 'bajo-stock'
    },
    {
      id: 3,
      codigo: 'RAM-003',
      producto: 'Memoria RAM DDR4 8GB',
      categoria: 'Componentes',
      stock: 25,
      ubicacion: 'Bodega A - Estante 2',
      estado: 'disponible'
    },
    {
      id: 4,
      codigo: 'SSD-004',
      producto: 'SSD Samsung 256GB NVMe',
      categoria: 'Almacenamiento',
      stock: 0,
      ubicacion: 'Bodega C - Estante 1',
      estado: 'descontinuado'
    },
    {
      id: 5,
      codigo: 'MOU-005',
      producto: 'Mouse Láser inalámbrico',
      categoria: 'Perifericos',
      stock: 18,
      ubicacion: 'Bodega B - Estante 2',
      estado: 'disponible'
    },
    {
      id: 6,
      codigo: 'USH-006',
      producto: 'Hub USB 7 puertos',
      categoria: 'Accesorios',
      stock: 8,
      ubicacion: 'Bodega A - Estante 4',
      estado: 'disponible'
    },
    {
      id: 7,
      codigo: 'CAB-007',
      producto: 'Cable HDMI Premium 2m',
      categoria: 'Cableria',
      stock: 42,
      ubicacion: 'Bodega D - Estante 1',
      estado: 'disponible'
    },
    {
      id: 8,
      codigo: 'PRJ-008',
      producto: 'Proyector Epson 3000 lúmenes',
      categoria: 'Audiovisual',
      stock: 2,
      ubicacion: 'Bodega C - Estante 3',
      estado: 'bajo-stock'
    },
    {
      id: 9,
      codigo: 'PAN-009',
      producto: 'Pantalla Interactiva 65"',
      categoria: 'Audiovisual',
      stock: 5,
      ubicacion: 'Bodega C - Estante 2',
      estado: 'disponible'
    },
    {
      id: 10,
      codigo: 'PSU-010',
      producto: 'Fuente de Poder 550W 80+',
      categoria: 'Componentes',
      stock: 1,
      ubicacion: 'Bodega A - Estante 3',
      estado: 'bajo-stock'
    }
  ];
  
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
}
