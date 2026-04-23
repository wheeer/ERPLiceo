import { Component, OnDestroy, inject } from '@angular/core';
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

  loginForm: FormGroup;
  
  // Estado del UI
  cargando = false;
  mostrarFormulario = true; // Control para evitar el flash (Corrección #1)
  error = '';
  isFocused = false;
  showPassword = false;

  // Loader (Heurística H1)
  private readonly loaderMessages = [
    "Sincronizando con el servidor central...",
    "Verificando permisos institucionales...",
    "Validando identidad...",
    "Preparando su espacio de trabajo..."
  ];
  loadingMessage = this.loaderMessages[0]; // Inicializado para evitar parpadeo (Corrección #5)
  private loaderSubscription?: Subscription;

  constructor() {
    this.loginForm = this.fb.group({
      rut: ['', [Validators.required, this.validarRutChileno]], // Validador real (Corrección #6)
      password: ['', [Validators.required]]
    });
  }

  // Algoritmo de Módulo 11 para RUT Chileno (Corrección #6)
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
    
    // Evitar múltiples envíos (Corrección #8)
    if (this.cargando || this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.error = '';
    this.cargando = true;
    
    // Iniciamos la transición suave
    setTimeout(() => {
        this.mostrarFormulario = false;
    }, 100);

    // Ciclo de mensajes (Honestos con el proceso de simulación)
    this.loaderSubscription = interval(1000).subscribe(val => {
      this.loadingMessage = this.loaderMessages[(val + 1) % this.loaderMessages.length];
    });

    // Simulación de latencia de red
    setTimeout(() => {
      this.loaderSubscription?.unsubscribe();
      this.cargando = false;
      
      const rutValue = this.loginForm.value.rut;

      // Usamos el AuthService real (Corrección #10)
      if (rutValue !== '0-0') { // Simulamos que todos los RUT válidos entran excepto este de prueba
        this.authService.login(rutValue);
        this.router.navigate(['/app/dashboard']);
      } else {
        this.error = 'Credenciales no reconocidas en la base de datos institucional.';
        this.mostrarFormulario = true;
        this.loginForm.controls['password'].reset(); // Reset silencioso pero con feedback de error (Corrección #9)
      }
    }, 3500); 
  }

  ngOnDestroy() {
    this.loaderSubscription?.unsubscribe();
  }
}
