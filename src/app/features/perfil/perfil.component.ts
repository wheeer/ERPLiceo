import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // Datos del usuario desde localStorage (cargados en el login)
  perfil = {
    nombre_completo: localStorage.getItem('user_display_name') || '',
    rut: localStorage.getItem('user_rut') || '',
    cargo: localStorage.getItem('user_cargo') || '',
    rol: localStorage.getItem('user_role') || '',
    fecha_ingreso: localStorage.getItem('user_fecha_ingreso') || '',
    tipo_contrato: localStorage.getItem('user_tipo_contrato') || '',
    ultimo_acceso: localStorage.getItem('user_ultimo_acceso') || '',
  };

  iniciales = this.calcularIniciales(this.perfil.nombre_completo);

  // Estado del formulario de cambio de clave
  claveForm!: FormGroup;
  guardando = false;
  mensajeExito = '';
  mensajeError = '';
  mostrarClaveActual = false;
  mostrarNuevaClave = false;
  mostrarConfirmar = false;

  ngOnInit() {
    this.claveForm = this.fb.group({
      clave_actual: ['', [Validators.required]],
      nueva_clave: ['', [Validators.required, Validators.minLength(8)]],
      confirmar_clave: ['', [Validators.required]]
    }, { validators: this.clavesCoinciden });
  }

  private clavesCoinciden(group: AbstractControl): ValidationErrors | null {
    const nueva = group.get('nueva_clave')?.value;
    const confirmar = group.get('confirmar_clave')?.value;
    return nueva === confirmar ? null : { noCoinciden: true };
  }

  private calcularIniciales(nombre: string): string {
    const partes = nombre.trim().split(' ');
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
  }

  getRolLabel(): string {
    if (!this.perfil.rol) return 'Sin rol';
    return this.perfil.rol.replace('_', ' ');
  }

  toggleCampo(campo: 'actual' | 'nueva' | 'confirmar') {
    if (campo === 'actual') this.mostrarClaveActual = !this.mostrarClaveActual;
    if (campo === 'nueva') this.mostrarNuevaClave = !this.mostrarNuevaClave;
    if (campo === 'confirmar') this.mostrarConfirmar = !this.mostrarConfirmar;
  }

  guardarClave() {
    if (this.claveForm.invalid || this.guardando) {
      this.claveForm.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.mensajeExito = '';
    this.mensajeError = '';

    const { clave_actual, nueva_clave } = this.claveForm.value;

    this.authService.cambiarClave(clave_actual, nueva_clave).subscribe({
      next: () => {
        this.guardando = false;
        this.mensajeExito = 'Contraseña actualizada correctamente. Por seguridad, vuelve a iniciar sesión.';
        this.claveForm.reset();
        setTimeout(() => this.authService.logout(), 3000);
      },
      error: (err) => {
        this.guardando = false;
        this.mensajeError = err.error?.error || 'Error al actualizar la contraseña.';
      }
    });
  }

  volver() {
    this.router.navigate(['/app/dashboard']);
  }
}
