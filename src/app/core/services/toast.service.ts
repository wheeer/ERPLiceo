import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface Toast {
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<Toast>();
  public toast$: Observable<Toast> = this.toastSubject.asObservable();

  show(message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success', duration: number = 3500) {
    this.toastSubject.next({ message, type, duration });
  }
}
