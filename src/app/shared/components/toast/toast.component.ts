import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: (Toast & { id: number; removing: boolean })[] = [];
  private toastService = inject(ToastService);
  private subscription!: Subscription;
  private idCounter = 0;

  ngOnInit() {
    this.subscription = this.toastService.toast$.subscribe(toast => {
      this.addToast(toast);
    });
  }

  addToast(toast: Toast) {
    const id = this.idCounter++;
    const newToast = { ...toast, id, removing: false };
    this.toasts.push(newToast);

    // Auto eliminar
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => this.removeToast(id), toast.duration);
    }
  }

  removeToast(id: number) {
    const toast = this.toasts.find(t => t.id === id);
    if (toast) {
      toast.removing = true; // Inicia animación de salida
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
      }, 300); // Tiempo de la transición CSS
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
