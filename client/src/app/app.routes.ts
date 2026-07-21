import { Routes } from '@angular/router';

import { adminAuthGuard } from './core/guards/admin-auth.guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';
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
import { AdminProductionFormComponent } from './admin/pages/admin-production-form/admin-production-form.component';
import { AdminPricePlanFormComponent } from './admin/pages/admin-price-plan-form/admin-price-plan-form.component';
import { AdminArtistFormComponent } from './admin/pages/admin-artist-form/admin-artist-form.component';
import { AdminMediaLibraryComponent } from './admin/pages/admin-media-library/admin-media-library.component';
import { AdminProductionListComponent } from './admin/pages/admin-production-list/admin-production-list.component';
import { AdminArtistListComponent } from './admin/pages/admin-artist-list/admin-artist-list.component';
import { AdminNewsListComponent } from './admin/pages/admin-news-list/admin-news-list.component';
import { AdminNewsFormComponent } from './admin/pages/admin-news-form/admin-news-form.component';
import { AdminPagesListComponent } from './admin/pages/admin-pages-list/admin-pages-list.component';
import { AdminAboutFormComponent } from './admin/pages/admin-about-form/admin-about-form.component';
import { AdminContactFormComponent } from './admin/pages/admin-contact-form/admin-contact-form.component';
import { AdminHomepageConfigComponent } from './admin/pages/admin-homepage-config/admin-homepage-config.component';
import { AdminSiteSettingsComponent } from './admin/pages/admin-site-settings/admin-site-settings.component';
import { AdminProductionPreviewComponent } from './admin/pages/admin-production-preview/admin-production-preview.component';
import { AdminArtistPreviewComponent } from './admin/pages/admin-artist-preview/admin-artist-preview.component';
import { AdminNewsPreviewComponent } from './admin/pages/admin-news-preview/admin-news-preview.component';
import { AdminPagePreviewComponent } from './admin/pages/admin-page-preview/admin-page-preview.component';
import { AdminHomepagePreviewComponent } from './admin/pages/admin-homepage-preview/admin-homepage-preview.component';
import { AdminPromoSlideListComponent } from './admin/pages/admin-promo-slide-list/admin-promo-slide-list.component';
import { AdminPromoSlideFormComponent } from './admin/pages/admin-promo-slide-form/admin-promo-slide-form.component';
import { AdminPromoSlidePreviewComponent } from './admin/pages/admin-promo-slide-preview/admin-promo-slide-preview.component';

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
        path: 'productions/new',
        component: AdminProductionFormComponent,
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'productions/:id/edit',
        component: AdminProductionFormComponent,
        canDeactivate: [unsavedChangesGuard],
      },
      { path: 'productions/:id/preview', component: AdminProductionPreviewComponent },
      { path: 'productions', component: AdminProductionListComponent },
      {
        path: 'artists/new',
        component: AdminArtistFormComponent,
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'artists/:id/edit',
        component: AdminArtistFormComponent,
        canDeactivate: [unsavedChangesGuard],
      },
      { path: 'artists/:id/preview', component: AdminArtistPreviewComponent },
      { path: 'artists', component: AdminArtistListComponent },
      { path: 'news/new', component: AdminNewsFormComponent, canDeactivate: [unsavedChangesGuard] },
      { path: 'news/:id/edit', component: AdminNewsFormComponent, canDeactivate: [unsavedChangesGuard] },
      { path: 'news/:id/preview', component: AdminNewsPreviewComponent },
      { path: 'news', component: AdminNewsListComponent },
      { path: 'promo-slides/new', component: AdminPromoSlideFormComponent, canDeactivate: [unsavedChangesGuard] },
      { path: 'promo-slides/:id/edit', component: AdminPromoSlideFormComponent, canDeactivate: [unsavedChangesGuard] },
      { path: 'promo-slides/:id/preview', component: AdminPromoSlidePreviewComponent },
      { path: 'promo-slides', component: AdminPromoSlideListComponent },
      { path: 'pages/about/preview', component: AdminPagePreviewComponent, data: { pageType: 'about' } },
      { path: 'pages/about', component: AdminAboutFormComponent, canDeactivate: [unsavedChangesGuard] },
      { path: 'pages/contact/preview', component: AdminPagePreviewComponent, data: { pageType: 'contact' } },
      { path: 'pages/contact', component: AdminContactFormComponent, canDeactivate: [unsavedChangesGuard] },
      { path: 'pages', component: AdminPagesListComponent },
      { path: 'homepage/preview', component: AdminHomepagePreviewComponent },
      { path: 'homepage', component: AdminHomepageConfigComponent, canDeactivate: [unsavedChangesGuard] },
      { path: 'site-settings', component: AdminSiteSettingsComponent, canDeactivate: [unsavedChangesGuard] },
      {
        path: 'price-plans/new',
        component: AdminPricePlanFormComponent,
      },
      {
        path: 'price-plans/:id/edit',
        component: AdminPricePlanFormComponent,
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
        path: 'media',
        component: AdminMediaLibraryComponent,
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
