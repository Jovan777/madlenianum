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
    { label: 'Dashboard', path: '/admin', icon: '⌂' },
    { label: 'System', path: '/admin/system', icon: '◆' },
    { label: 'Productions', path: '/admin/productions', icon: '🎭' },
    { label: 'Events', path: '/admin/events', icon: '◷' },
    { label: 'Venues', path: '/admin/venues', icon: '▣' },
    { label: 'Seat Maps', path: '/admin/seat-maps', icon: '◉' },
    { label: 'Seats', path: '/admin/seats', icon: '●' },
    { label: 'Price Plans', path: '/admin/price-plans', icon: 'RSD' },
    { label: 'Orders', path: '/admin/orders', icon: '✓' },
    { label: 'Customers', path: '/admin/customers', icon: '👤' },
    { label: 'Artists', path: '/admin/artists', icon: '✦' },
    { label: 'News', path: '/admin/news', icon: '↗' },
  ];

  constructor(readonly authService: AuthService) {}

  logout(): void {
    this.authService.logout();
  }
}
