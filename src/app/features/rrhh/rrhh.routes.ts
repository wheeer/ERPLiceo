import { Routes } from '@angular/router';

// Importamos la pantalla usando el nombre exacto de la clase que encontraste
// y la ruta al archivo 'resumen-mes.ts'
import { ResumenMes } from './resumen-mes/resumen-mes';

// Definimos el menú de rutas exclusivo para tu área de Recursos Humanos
export const rrhhRoutes: Routes = [
  { 
    path: 'resumen-mensual', 
    component: ResumenMes 
  }
];