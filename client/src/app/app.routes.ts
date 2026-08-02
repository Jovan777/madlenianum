import { Routes } from '@angular/router';

import { adminAuthGuard } from './core/guards/admin-auth.guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';
import { AdminLoginComponent } from './admin/pages/admin-login/admin-login.component';
import { AdminLayoutComponent } from './admin/layout/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './admin/pages/admin-dashboard/admin-dashboard.component';
import { AdminResourceListComponent } from './admin/pages/admin-resource-list/admin-resource-list.component';
import { AdminResourceFormComponent } from './admin/pages/admin-resource-form/admin-resource-form.component';
import { AdminOrderDetailComponent } from './admin/pages/admin-order-detail/admin-order-detail.component';
import { AdminProductionFormComponent } from './admin/pages/admin-production-form/admin-production-form.component';
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
        loadComponent: () => import('./admin/pages/admin-system-status/admin-system-status.component').then((item) => item.AdminSystemStatusComponent),
      },
      {
        path: 'audit-logs',
        loadComponent: () => import('./admin/pages/admin-audit-log/admin-audit-log.component').then((item) => item.AdminAuditLogComponent),
      },
      {
        path: 'events/new',
        loadComponent: () => import('./admin/pages/admin-event-form/admin-event-form.component').then((item) => item.AdminEventFormComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'events/:id/edit',
        loadComponent: () => import('./admin/pages/admin-event-form/admin-event-form.component').then((item) => item.AdminEventFormComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'events/:id/seat-overrides',
        loadComponent: () => import('./admin/pages/admin-event-seat-overrides/admin-event-seat-overrides.component').then((item) => item.AdminEventSeatOverridesComponent),
      },
      {
        path: 'events/:id',
        loadComponent: () => import('./admin/pages/admin-event-detail/admin-event-detail.component').then((item) => item.AdminEventDetailComponent),
      },
      {
        path: 'events',
        loadComponent: () => import('./admin/pages/admin-event-list/admin-event-list.component').then((item) => item.AdminEventListComponent),
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
        loadComponent: () => import('./admin/pages/admin-price-plan-form/admin-price-plan-form.component').then((item) => item.AdminPricePlanFormComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'price-plans/:id/edit',
        loadComponent: () => import('./admin/pages/admin-price-plan-form/admin-price-plan-form.component').then((item) => item.AdminPricePlanFormComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'price-plans',
        loadComponent: () => import('./admin/pages/admin-price-plan-list/admin-price-plan-list.component').then((item) => item.AdminPricePlanListComponent),
      },
      {
        path: 'orders',
        loadComponent: () => import('./admin/pages/admin-order-list/admin-order-list.component').then((item) => item.AdminOrderListComponent),
      },
      {
        path: 'orders/:id',
        component: AdminOrderDetailComponent,
      },
      {
        path: 'seat-maps/:id/map',
        loadComponent: () => import('./admin/pages/admin-seat-map-designer/admin-seat-map-designer.component').then((item) => item.AdminSeatMapDesignerComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'seat-maps/:id/preview',
        loadComponent: () => import('./admin/pages/admin-seat-map-preview/admin-seat-map-preview.component').then((item) => item.AdminSeatMapPreviewComponent),
      },
      {
        path: 'seat-maps',
        loadComponent: () => import('./admin/pages/admin-seat-map-list/admin-seat-map-list.component').then((item) => item.AdminSeatMapListComponent),
      },
      {
        path: 'media',
        component: AdminMediaLibraryComponent,
      },
      {
        path: 'fundus/:kind/new',
        loadComponent: () => import('./admin/pages/admin-fundus-form/admin-fundus-form.component').then((item) => item.AdminFundusFormComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'fundus/:kind/:id/edit',
        loadComponent: () => import('./admin/pages/admin-fundus-form/admin-fundus-form.component').then((item) => item.AdminFundusFormComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'fundus/:kind/:id/preview',
        loadComponent: () => import('./admin/pages/admin-phase6a-preview/admin-phase6a-preview.component').then((item) => item.AdminPhase6APreviewComponent),
        data: { previewType: 'fundus' },
      },
      {
        path: 'fundus',
        loadComponent: () => import('./admin/pages/admin-fundus-list/admin-fundus-list.component').then((item) => item.AdminFundusListComponent),
      },
      {
        path: 'rental-spaces/new',
        loadComponent: () => import('./admin/pages/admin-rental-space-form/admin-rental-space-form.component').then((item) => item.AdminRentalSpaceFormComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'rental-spaces/:id/edit',
        loadComponent: () => import('./admin/pages/admin-rental-space-form/admin-rental-space-form.component').then((item) => item.AdminRentalSpaceFormComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'rental-spaces/:id/preview',
        loadComponent: () => import('./admin/pages/admin-phase6a-preview/admin-phase6a-preview.component').then((item) => item.AdminPhase6APreviewComponent),
        data: { previewType: 'rental-space' },
      },
      {
        path: 'rental-spaces',
        loadComponent: () => import('./admin/pages/admin-rental-space-list/admin-rental-space-list.component').then((item) => item.AdminRentalSpaceListComponent),
      },
      {
        path: 'inquiries/:kind/:id',
        loadComponent: () => import('./admin/pages/admin-inquiry-detail/admin-inquiry-detail.component').then((item) => item.AdminInquiryDetailComponent),
      },
      {
        path: 'inquiries',
        loadComponent: () => import('./admin/pages/admin-inquiry-list/admin-inquiry-list.component').then((item) => item.AdminInquiryListComponent),
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
    path: 'en',
    component: PublicLayoutComponent,
    data: { locale: 'en' },
    children: [
      { path: '', component: PublicHomeComponent },
      { path: 'repertoire', component: PublicRepertoireComponent },
      { path: 'productions/:slug', component: PublicProductionDetailComponent },
      { path: 'tickets/:eventId', component: PublicTicketingComponent },
      { path: 'order', component: PublicOrderLookupComponent },
      { path: 'order/:identifier', component: PublicOrderLookupComponent },
      { path: 'artists', component: PublicArtistsComponent },
      { path: 'artists/:slug', component: PublicArtistDetailComponent },
      {
        path: 'news',
        loadComponent: () => import('./public/pages/public-news/public-news.component').then((item) => item.PublicNewsComponent),
      },
      {
        path: 'news/:slug',
        loadComponent: () => import('./public/pages/public-news-detail/public-news-detail.component').then((item) => item.PublicNewsDetailComponent),
      },
      {
        path: 'fundus',
        loadComponent: () => import('./public/pages/public-fundus/public-fundus.component').then((item) => item.PublicFundusComponent),
      },
      {
        path: 'fundus/costumes/:slug',
        loadComponent: () => import('./public/pages/public-fundus-detail/public-fundus-detail.component').then((item) => item.PublicFundusDetailComponent),
        data: { kind: 'costume', locale: 'en' },
      },
      {
        path: 'fundus/props-scenography/:slug',
        loadComponent: () => import('./public/pages/public-fundus-detail/public-fundus-detail.component').then((item) => item.PublicFundusDetailComponent),
        data: { kind: 'prop', locale: 'en' },
      },
      {
        path: 'venue-rental',
        loadComponent: () => import('./public/pages/public-rental-spaces/public-rental-spaces.component').then((item) => item.PublicRentalSpacesComponent),
      },
      {
        path: 'venue-rental/:slug',
        loadComponent: () => import('./public/pages/public-rental-space-detail/public-rental-space-detail.component').then((item) => item.PublicRentalSpaceDetailComponent),
      },
      { path: 'page/:slug', component: PublicStaticPageComponent },
      { path: 'about', component: PublicStaticPageComponent, data: { staticSlug: 'o-nama', locale: 'en' } },
      { path: 'contact', component: PublicStaticPageComponent, data: { staticSlug: 'kontakt', locale: 'en' } },
    ],
  },
  {
    path: '',
    component: PublicLayoutComponent,
    data: { locale: 'sr' },
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
        path: 'vesti',
        loadComponent: () => import('./public/pages/public-news/public-news.component').then((item) => item.PublicNewsComponent),
      },
      {
        path: 'vesti/:slug',
        loadComponent: () => import('./public/pages/public-news-detail/public-news-detail.component').then((item) => item.PublicNewsDetailComponent),
      },
      {
        path: 'fundusi',
        loadComponent: () => import('./public/pages/public-fundus/public-fundus.component').then((item) => item.PublicFundusComponent),
      },
      {
        path: 'fundusi/kostimi/:slug',
        loadComponent: () => import('./public/pages/public-fundus-detail/public-fundus-detail.component').then((item) => item.PublicFundusDetailComponent),
        data: { kind: 'costume' },
      },
      {
        path: 'fundusi/rekviziti-scenografija/:slug',
        loadComponent: () => import('./public/pages/public-fundus-detail/public-fundus-detail.component').then((item) => item.PublicFundusDetailComponent),
        data: { kind: 'prop' },
      },
      {
        path: 'zakup-prostora',
        loadComponent: () => import('./public/pages/public-rental-spaces/public-rental-spaces.component').then((item) => item.PublicRentalSpacesComponent),
      },
      {
        path: 'zakup-prostora/:slug',
        loadComponent: () => import('./public/pages/public-rental-space-detail/public-rental-space-detail.component').then((item) => item.PublicRentalSpaceDetailComponent),
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
