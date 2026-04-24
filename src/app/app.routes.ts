import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { RrhhComponent } from './features/rrhh/rrhh.component';
import { RemuneracionesComponent } from './features/remuneraciones/remuneraciones.component';
import { InventarioComponent } from './features/inventario/inventario.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent, data: { title: 'Dashboard Principal' } },
      { path: 'rrhh', component: RrhhComponent, data: { title: 'Recursos Humanos' } },
      { path: 'remuneraciones', component: RemuneracionesComponent, data: { title: 'Remuneraciones' } },
      { path: 'inventario', component: InventarioComponent, data: { title: 'Inventario y Stock' } },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  // Comodín para redirigir rutas no encontradas
  { path: '**', redirectTo: 'login' }
];
