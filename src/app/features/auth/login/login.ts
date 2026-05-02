import { Component, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { NgIf, NgFor, CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  loginForm: FormGroup;
  
  // Estado del UI
  cargando = false;
  mostrarFormulario = true;
  error = '';
  isFocused = false;
  showPassword = false;

  // Loader
  private readonly loaderMessages = [
    "Sincronizando con el servidor central...",
    "Verificando permisos institucionales...",
    "Validando identidad...",
    "Preparando su espacio de trabajo..."
  ];
  loadingMessage = this.loaderMessages[0];
  private loaderSubscription?: Subscription;

  constructor() {
    this.loginForm = this.fb.group({
      rut: ['', [Validators.required, this.validarRutChileno]],
      password: ['', [Validators.required]]
    });
  }

  // Algoritmo de Módulo 11 para RUT Chileno
  private validarRutChileno(control: AbstractControl): ValidationErrors | null {
    const value = control.value?.replace(/\./g, '').replace(/-/g, '').toUpperCase();
    if (!value || value.length < 8) return { rutInvalido: true };

    const cuerpo = value.slice(0, -1);
    const dv = value.slice(-1);

    if (!/^\d+$/.test(cuerpo)) return { rutInvalido: true };

    let suma = 0;
    let multiplo = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += multiplo * parseInt(cuerpo.charAt(i));
      multiplo = multiplo < 7 ? multiplo + 1 : 2;
    }

    const dvEsperado = 11 - (suma % 11);
    let dvFinal = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();

    return dv === dvFinal ? null : { rutInvalido: true };
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  iniciarSesion(event?: Event) {
    if (event) event.preventDefault();
    
    // Evitar múltiples envíos
    if (this.cargando || this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.error = '';
    this.cargando = true;
    this.mostrarFormulario = false;
    this.cdr.detectChanges();

    // Ciclo de mensajes de carga
    this.loaderSubscription = interval(1000).subscribe(val => {
      this.loadingMessage = this.loaderMessages[(val + 1) % this.loaderMessages.length];
      this.cdr.detectChanges();
    });

    // Llamada al Backend a través del AuthService
    const rutValue = this.loginForm.value.rut;
    const passwordValue = this.loginForm.value.password;

    // Retraso por UX para permitir lectura del loader
    setTimeout(() => {
      this.authService.login(rutValue, passwordValue).subscribe({
      next: (respuesta) => {
        // El servidor dijo "200 OK"
        this.loaderSubscription?.unsubscribe();
        this.cargando = false;
        
        // Redirigir al Dashboard
        this.router.navigate(['/app/dashboard']);
      },
      error: (errorRespuesta) => {
        // El servidor dijo "401 Error" o "404 No encontrado"
        this.loaderSubscription?.unsubscribe();
        this.cargando = false;
        
        // Extraer el mensaje de error de Django si existe
        if (errorRespuesta.error && errorRespuesta.error.error) {
          this.error = errorRespuesta.error.error;
        } else {
          this.error = 'Error de conexión con el servidor.';
        }
        
        this.mostrarFormulario = true;
        this.loginForm.controls['password'].reset(); // Obligar a escribir la clave de nuevo
        this.cdr.detectChanges();
      }
    });
    }, 2500); // 2.5 segundos de carga garantizada
  }

  ngOnDestroy() {
    this.loaderSubscription?.unsubscribe();
  }
}
