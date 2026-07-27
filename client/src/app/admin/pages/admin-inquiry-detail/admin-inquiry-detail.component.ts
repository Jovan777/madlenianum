import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';

import { INQUIRY_STATUS_OPTIONS, emailStatusLabel, inquiryStatusLabel } from '../../../core/models/phase6a-labels';
import { EventPlanningInquiry, InquiryStatus, Phase6AItemResponse, RentalInquiry } from '../../../core/models/phase6a.models';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';
import { Phase6AAdminService } from '../../../core/services/phase6a-admin.service';

@Component({
  selector: 'app-admin-inquiry-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-inquiry-detail.component.html',
  styleUrl: './admin-inquiry-detail.component.scss',
})
export class AdminInquiryDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(Phase6AAdminService);
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(AdminNotificationService);

  readonly kind = signal<'rental' | 'planning'>('rental');
  readonly item = signal<RentalInquiry | EventPlanningInquiry | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly statuses = INQUIRY_STATUS_OPTIONS.filter((option) => option.value);
  readonly form = this.fb.nonNullable.group({ status: ['new'], reason: [''], internalNotes: [''] });

  ngOnInit(): void { this.kind.set(this.route.snapshot.paramMap.get('kind') === 'planning' ? 'planning' : 'rental'); this.load(); }
  status(value: string): string { return inquiryStatusLabel(value); }
  email(value?: string): string { return emailStatusLabel(value); }
  space(item: RentalInquiry | EventPlanningInquiry): string { return this.isRentalInquiry(item) ? item.rentalSpaceSnapshot?.title || 'Nepoznat prostor' : item.preferredRentalSpaceSnapshot?.title || 'Nije odabran'; }
  eventType(item: RentalInquiry | EventPlanningInquiry): string { return this.isRentalInquiry(item) ? '' : item.eventType || ''; }

  saveStatus(): void {
    const item = this.item();
    if (!item || this.saving()) return;
    this.saving.set(true);
    this.api.updateInquiryStatus<RentalInquiry | EventPlanningInquiry>(this.resource(), item.id, this.form.controls.status.value as InquiryStatus, this.form.controls.reason.value).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (response) => { this.item.set(response.item); this.form.controls.reason.reset(); this.notifications.success('Status je ažuriran.'); },
      error: (error) => this.notifications.error(error?.error?.message || 'Status nije promenjen.'),
    });
  }

  saveNotes(): void {
    const item = this.item();
    if (!item) return;
    this.saving.set(true);
    this.api.updateInquiryNotes<RentalInquiry | EventPlanningInquiry>(this.resource(), item.id, this.form.controls.internalNotes.value).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (response) => { this.item.set(response.item); this.notifications.success('Interne beleške su sačuvane.'); },
      error: (error) => this.notifications.error(error?.error?.message || 'Beleške nisu sačuvane.'),
    });
  }

  resend(): void {
    const item = this.item();
    if (!item) return;
    this.saving.set(true);
    this.api.resendInquiry(this.resource(), item.id).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (response) => { this.notifications.success(response.message); this.load(); },
      error: (error) => this.notifications.error(error?.error?.message || 'Obaveštenje nije poslato.'),
    });
  }

  private load(): void {
    this.loading.set(true);
    const id = this.route.snapshot.paramMap.get('id') || '';
    const request = (this.kind() === 'rental' ? this.api.getRentalInquiry(id) : this.api.getEventPlanningInquiry(id)) as Observable<Phase6AItemResponse<RentalInquiry | EventPlanningInquiry>>;
    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => { this.item.set(response.item); this.form.patchValue({ status: response.item.status, internalNotes: response.item.internalNotes || '' }); },
      error: (error) => this.error.set(error?.error?.message || 'Upit nije učitan.'),
    });
  }

  private resource(): 'rental-inquiries' | 'event-planning-inquiries' { return this.kind() === 'rental' ? 'rental-inquiries' : 'event-planning-inquiries'; }
  private isRentalInquiry(item: RentalInquiry | EventPlanningInquiry): item is RentalInquiry { return 'rentalSpaceSnapshot' in item || 'rentalSpace' in item; }
}
