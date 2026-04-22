import { Component, OnDestroy } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [NgIf, NgFor, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnDestroy {
  loginForm: FormGroup;
  
  // Estado del UI
  cargando = false;
  error = '';
  isFocused = false;

  // Blocking Loader (Mensajes de carga seguros - Heurística de Visibilidad)
  private readonly loaderMessages = [
    "Estableciendo canal seguro...",
    "Validando credenciales...",
    "Generando token de sesión...",
    "Preparando entorno..."
  ];
  loadingMessage = '';
  private loaderSubscription?: Subscription;

  constructor(private fb: FormBuilder, private router: Router) {
    // Formularios Reactivos para limpieza y validación robusta
    this.loginForm = this.fb.group({
      rut: ['', [Validators.required, Validators.minLength(4)]],
      password: ['', [Validators.required]]
    });
  }

  ngOnDestroy() {
    if (this.loaderSubscription) this.loaderSubscription.unsubscribe();
  }

  /**
   * Evento que detona la micro-interacción visual al enfocar inputs
   * Ayuda a la accesibilidad destacando la columna activa.
   */
  setFocus(state: boolean) {
    this.isFocused = state;
  }

  /**
   * Manejo seguro del login, incluyendo timing attack prevention (simulado)
   */
  iniciarSesion(event?: Event) {
    if (event) event.preventDefault();
    if (this.loginForm.invalid) {
      // Forzar que se muestren los errores si intentan enviar vacío
      this.loginForm.markAllAsTouched();
      return;
    }

    this.error = '';
    this.cargando = true;
    this.loadingMessage = this.loaderMessages[0];

    // Rotación de mensajes en el Blocking Loader
    let msgIndex = 1;
    this.loaderSubscription = interval(800).subscribe(() => {
      if (msgIndex < this.loaderMessages.length) {
        this.loadingMessage = this.loaderMessages[msgIndex];
        msgIndex++;
      }
    });

    // Simular tiempo de respuesta uniforme para evitar ataques de timing (Heurística de seguridad)
    setTimeout(() => {
      if (this.loaderSubscription) this.loaderSubscription.unsubscribe();
      
      this.cargando = false;
      
      // Simulación: redirigir si el RUT no es "error" (para pruebas)
      if (this.loginForm.value.rut !== 'error') {
        this.router.navigate(['/app/dashboard']);
      } else {
        this.error = 'Credenciales inválidas. Acceso denegado.';
        this.loginForm.controls['password'].reset();
      }
    }, 3500); 
  }
}
