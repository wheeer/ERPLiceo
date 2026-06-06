import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, timer } from 'rxjs';
import { retry, delayWhen } from 'rxjs/operators';

export interface AppNotification {
  message: string;
  modulo: string;
  url_destino: string;
  leida?: boolean;
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
}
