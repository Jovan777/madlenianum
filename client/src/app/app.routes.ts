import { Routes } from '@angular/router';

import { adminAuthGuard } from './core/guards/admin-auth.guard';
import { AdminLoginComponent } from './admin/pages/admin-login/admin-login.component';
import { AdminLayoutComponent } from './admin/layout/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './admin/pages/admin-dashboard/admin-dashboard.component';
import { AdminSystemStatusComponent } from './admin/pages/admin-system-status/admin-system-status.component';
import { AdminResourceListComponent } from './admin/pages/admin-resource-list/admin-resource-list.component';
import { AdminResourceFormComponent } from './admin/pages/admin-resource-form/admin-resource-form.component';
import { AdminEventDetailComponent } from './admin/pages/admin-event-detail/admin-event-detail.component';
import { AdminEventFormComponent } from './admin/pages/admin-event-form/admin-event-form.component';
import { AdminOrderDetailComponent } from './admin/pages/admin-order-detail/admin-order-detail.component';
import { AdminSeatMapDesignerComponent } from './admin/pages/admin-seat-map-designer/admin-seat-map-designer.component';

import { PublicLayoutComponent } from './public/layout/public-layout/public-layout.component';
import { PublicHomeComponent } from './public/pages/public-home/public-home.component';
import { PublicProductionsComponent } from './public/pages/public-productions/public-productions.component';
import { PublicProductionDetailComponent } from './public/pages/public-production-detail/public-production-detail.component';
import { PublicRepertoireComponent } from './public/pages/public-repertoire/public-repertoire.component';
import { PublicTicketingComponent } from './public/pages/public-ticketing/public-ticketing.component';
import { PublicOrderLookupComponent } from './public/pages/public-order-lookup/public-order-lookup.component';
import { PublicStaticPageComponent } from './public/pages/public-static-page/public-static-page.component';
import { PublicArtistsComponent } from './public/pages/public-artists/public-artists.component';
import { PublicArtistDetailComponent } from './public/pages/public-artist-detail/public-artist-detail.component';

export const routes: Routes = [
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
        path: 'events/new',
        component: AdminEventFormComponent,
      },
      {
        path: 'events/:id/edit',
        component: AdminEventFormComponent,
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
        path: 'seat-maps/:id/map',
        component: AdminSeatMapDesignerComponent,
      },
      {
        path: ':resource/new',
        component: AdminResourceFormComponent,
      },
      {
        path: ':resource/:id/edit',
        component: AdminResourceFormComponent,
      },
      {
        path: ':resource',
        component: AdminResourceListComponent,
      },
    ],
  },
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        component: PublicHomeComponent,
      },
      {
        path: 'repertoar',
        component: PublicRepertoireComponent,
      },
      {
        path: 'predstave',
        component: PublicProductionsComponent,
      },
      {
        path: 'predstave/:slug',
        component: PublicProductionDetailComponent,
      },
      {
        path: 'kupovina/:eventId',
        component: PublicTicketingComponent,
      },
      {
        path: 'porudzbina',
        component: PublicOrderLookupComponent,
      },
      {
        path: 'porudzbina/:identifier',
        component: PublicOrderLookupComponent,
      },
      {
        path: 'umetnici',
        component: PublicArtistsComponent,
      },
      {
        path: 'umetnici/:slug',
        component: PublicArtistDetailComponent,
      },
      {
        path: 'strana/:slug',
        component: PublicStaticPageComponent,
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
