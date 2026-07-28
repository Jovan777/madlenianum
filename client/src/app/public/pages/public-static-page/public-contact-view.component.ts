import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { PublicApiService } from '../../../core/services/public-api.service';

@Component({
  selector: 'app-public-contact-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './public-contact-view.component.html',
  styleUrl: './public-contact-view.component.scss',
})
export class PublicContactViewComponent implements OnChanges {
  @Input({ required: true }) page: any;

  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  readonly publicApi = inject(PublicApiService);

  readonly sending = signal(false);
  readonly sent = signal(false);
  readonly error = signal('');
  mapUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    subject: [''],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  ngOnChanges(): void {
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.google.com/maps?q=${encodeURIComponent(this.address())}&output=embed`,
    );
  }

  heroImage(): string {
    return this.publicApi.mediaUrl(this.page?.image) || this.publicApi.fallbackImage(2);
  }

  organizationContact(): any {
    return this.page?.organizationContact || {};
  }

  phone(): string {
    const contact = this.organizationContact();
    return contact.phone || contact.phones?.[0] || '+381 11 316 27 20';
  }

  email(): string {
    const contact = this.organizationContact();
    return contact.email || contact.generalEmail || 'office@madlenianum.rs';
  }

  address(): string {
    return this.organizationContact()?.address || 'Glavna 32, Zemun, Beograd';
  }

  officeHours(): string {
    return this.page?.contact?.officeHours || 'Radnim danima 09:00-17:00';
  }

  additionalItems(): any[] {
    return Array.isArray(this.page?.contact?.additionalItems) ? this.page.contact.additionalItems : [];
  }

  socialLinks(): any[] {
    return Array.isArray(this.page?.socialLinks) ? this.page.socialLinks : [];
  }

  phoneHref(): string {
    return `tel:${this.phone().replace(/[^+\d]/g, '')}`;
  }

  submit(): void {
    this.error.set('');
    this.sent.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    this.publicApi.sendContactMessage({
      ...this.form.getRawValue(),
      sourcePage: window.location.href,
    }).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
        this.form.reset();
      },
      error: () => {
        this.sending.set(false);
        this.error.set('Poruka trenutno nije poslata. Molimo pokušajte ponovo.');
      },
    });
  }
}
