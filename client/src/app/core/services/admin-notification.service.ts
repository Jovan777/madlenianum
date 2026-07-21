import { Injectable, signal } from '@angular/core';

export interface AdminNotification {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AdminNotificationService {
  private nextId = 1;
  readonly messages = signal<AdminNotification[]>([]);

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message, 6500);
  }

  info(message: string): void {
    this.show('info', message);
  }

  dismiss(id: number): void {
    this.messages.update((items) => items.filter((item) => item.id !== id));
  }

  private show(type: AdminNotification['type'], message: string, duration = 4500): void {
    const notification = { id: this.nextId++, type, message };
    this.messages.update((items) => [...items, notification]);
    window.setTimeout(() => this.dismiss(notification.id), duration);
  }
}
