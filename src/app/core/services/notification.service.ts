import { Injectable, inject } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, timer } from 'rxjs';
import { retry, delayWhen } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

export interface AppNotification {
  _id?: string;
  mensaje: string;
  modulo: string;
  tipo?: string;
  url_destino: string;
  leida?: boolean;
  fecha_creacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private socket$!: WebSocketSubject<any>;

  constructor() {
    this.connect();
  }

  private connect() {
    // Para entornos reales la URL debería venir de environment.ts (wss:// vs ws://)
    this.socket$ = webSocket('ws://localhost:8000/ws/notifications/');
  }

  public getNotifications(): Observable<AppNotification> {
    return this.socket$.asObservable().pipe(
      retry({
        delay: (error) => {
          console.warn('⚠️ WebSocket desconectado, reintentando en 3s...', error);
          return timer(3000);
        }
      })
    );
  }

  public sendMessage(msg: any) {
    this.socket$.next(msg);
  }

  private http = inject(HttpClient);
  private readonly apiUrl = 'http://127.0.0.1:8000/api';

  public getHistoricalNotifications(): Observable<any> {
    return this.http.get(`${this.apiUrl}/notificaciones/`);
  }

  public markAsRead(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/notificaciones/${id}/`, {});
  }

  public getCriticalStock(): Observable<any> {
    return this.http.get(`${this.apiUrl}/inventario/criticos/`);
  }
}
