import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { AdminNotificationService } from '../../../core/services/admin-notification.service';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-notifications.component.html',
  styleUrl: './admin-notifications.component.scss',
})
export class AdminNotificationsComponent {
  readonly notifications = inject(AdminNotificationService);
}
