import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { RrhhComponent } from './features/rrhh/rrhh.component';
import { RemuneracionesComponent } from './features/remuneraciones/remuneraciones.component';
import { InventarioComponent } from './features/inventario/inventario.component';
import { PerfilComponent } from './features/perfil/perfil.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [authGuard], // Primer filtro: ¿está logueado?
    children: [
      { path: 'dashboard', component: DashboardComponent, data: { title: 'Dashboard Principal' } },
      
      // Módulos protegidos por Rol
      { 
        path: 'rrhh', 
        component: RrhhComponent, 
        canActivate: [roleGuard],
        data: { title: 'Recursos Humanos', roles: ['Encargado_RRHH'] } 
      },
      { 
        path: 'remuneraciones', 
        component: RemuneracionesComponent, 
        canActivate: [roleGuard],
        data: { title: 'Remuneraciones', roles: ['Encargado_Remuneraciones'] } 
      },
      { 
        path: 'inventario', 
        component: InventarioComponent, 
        canActivate: [roleGuard],
        data: { title: 'Inventario y Stock', roles: ['Encargado_Bodega'] } 
      },
      { path: 'perfil', component: PerfilComponent, data: { title: 'Mi Perfil' } },
      
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  // Comodín para redirigir rutas no encontradas
  { path: '**', redirectTo: 'login' }
];
