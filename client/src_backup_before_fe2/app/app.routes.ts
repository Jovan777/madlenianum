import { Routes } from '@angular/router';

import { adminAuthGuard } from './core/guards/admin-auth.guard';
import { AdminLoginComponent } from './admin/pages/admin-login/admin-login.component';
import { AdminLayoutComponent } from './admin/layout/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './admin/pages/admin-dashboard/admin-dashboard.component';
import { AdminSystemStatusComponent } from './admin/pages/admin-system-status/admin-system-status.component';
import { AdminResourceListComponent } from './admin/pages/admin-resource-list/admin-resource-list.component';
import { AdminEventDetailComponent } from './admin/pages/admin-event-detail/admin-event-detail.component';
import { AdminOrderDetailComponent } from './admin/pages/admin-order-detail/admin-order-detail.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'admin',
  },
  {
    path: 'admin/login',
    component: AdminLoginComponent,
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminAuthGuard],
    children: [
      {
        path: '',
        component: AdminDashboardComponent,
      },
      {
        path: 'system',
        component: AdminSystemStatusComponent,
      },
      {
        path: 'events/:id',
        component: AdminEventDetailComponent,
      },
      {
        path: 'orders/:id',
        component: AdminOrderDetailComponent,
      },
      {
        path: ':resource',
        component: AdminResourceListComponent,
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'admin',
  },
];
