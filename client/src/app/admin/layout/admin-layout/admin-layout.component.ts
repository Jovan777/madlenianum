import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AdminMenuItem } from '../../../core/models/admin.models';
import { AuthService } from '../../../core/services/auth.service';
import { AdminNotificationsComponent } from '../../components/admin-notifications/admin-notifications.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, AdminNotificationsComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  readonly menuItems: AdminMenuItem[] = [
    { label: 'Dashboard', path: '/admin', icon: 'D' },
    { label: 'Repertoar / Events', path: '/admin/events', icon: 'R' },
    { label: 'Predstave / Productions', path: '/admin/productions', icon: 'P' },
    { label: 'Umetnici / Artists', path: '/admin/artists', icon: 'A' },
    { label: 'Venues', path: '/admin/venues', icon: 'V' },
    { label: 'Seat maps', path: '/admin/seat-maps', icon: 'M' },
    { label: 'Price plans', path: '/admin/price-plans', icon: 'L' },
    { label: 'Price categories', path: '/admin/price-categories', icon: 'C' },
    { label: 'Porudžbine i rezervacije', path: '/admin/orders', icon: 'O' },
    { label: 'Media Library', path: '/admin/media', icon: 'I' },
    { label: 'Pages / Content', path: '/admin/pages', icon: 'G' },
    { label: 'News', path: '/admin/news', icon: 'N' },
    { label: 'Promo slides', path: '/admin/promo-slides', icon: 'B' },
    { label: 'Homepage', path: '/admin/homepage', icon: 'H' },
    { label: 'Site settings', path: '/admin/site-settings', icon: 'T' },
    { label: 'System', path: '/admin/system', icon: 'S' },
  ];

  constructor(readonly authService: AuthService) {}

  logout(): void {
    this.authService.logout();
  }
}
