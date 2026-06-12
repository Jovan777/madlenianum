import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AdminMenuItem } from '../../../core/models/admin.models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  readonly menuItems: AdminMenuItem[] = [
    { label: 'Studio', path: '/admin', icon: '01' },
    { label: 'Program', path: '/admin/productions', icon: '02' },
    { label: 'Dates', path: '/admin/events', icon: '03' },
    { label: 'Halls', path: '/admin/venues', icon: '04' },
    { label: 'Maps', path: '/admin/seat-maps', icon: '05' },
    { label: 'Prices', path: '/admin/price-plans', icon: '06' },
    { label: 'Orders', path: '/admin/orders', icon: '07' },
    { label: 'People', path: '/admin/artists', icon: '08' },
    { label: 'News', path: '/admin/news', icon: '09' },
    { label: 'System', path: '/admin/system', icon: '10' },
  ];

  constructor(readonly authService: AuthService) {}

  logout(): void {
    this.authService.logout();
  }
}
