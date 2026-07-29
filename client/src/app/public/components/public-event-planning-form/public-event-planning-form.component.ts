import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { RentalSpace } from '../../../core/models/phase6a.models';
import { PublicSiteSettings } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicI18nService } from '../../i18n/public-i18n.service';

@Component({selector:'app-public-event-planning-form',standalone:true,imports:[CommonModule,ReactiveFormsModule],templateUrl:'./public-event-planning-form.component.html',styleUrl:'./public-event-planning-form.component.scss'})
export class PublicEventPlanningFormComponent {
  readonly spaces=input<RentalSpace[]>([]);readonly settings=input<PublicSiteSettings|null>(null);readonly preferredSpaceId=input('');private readonly fb=inject(FormBuilder);private readonly api=inject(PublicApiService);readonly i18n=inject(PublicI18nService);readonly submitting=signal(false);readonly error=signal('');readonly reference=signal('');readonly emailWarning=signal(false);private idempotencyKey=this.newKey();
  readonly form=this.fb.nonNullable.group({firstName:['',Validators.required],lastName:['',Validators.required],companyName:[''],email:['',[Validators.required,Validators.email]],phone:['',Validators.required],preferredRentalSpace:[''],desiredDate:[''],approximateGuestCount:this.fb.control<number|null>(null,[Validators.min(1)]),eventType:[''],note:['']});
  constructor(){effect(()=>{const preferredSpaceId=this.preferredSpaceId();if(preferredSpaceId&&this.spaces().some(space=>space.id===preferredSpaceId)){this.form.controls.preferredRentalSpace.setValue(preferredSpaceId);}});}
  submit():void{if(this.form.invalid||this.submitting())return this.form.markAllAsTouched();const raw=this.form.getRawValue();this.submitting.set(true);this.error.set('');this.api.createEventPlanningInquiry({...raw,preferredRentalSpace:raw.preferredRentalSpace||undefined,desiredDate:raw.desiredDate||undefined,approximateGuestCount:raw.approximateGuestCount||undefined,idempotencyKey:this.idempotencyKey}).pipe(finalize(()=>this.submitting.set(false))).subscribe({next:r=>{this.reference.set(r.item.referenceNumber);this.emailWarning.set(['failed','not_configured'].includes(r.emailStatus||''));this.form.reset();this.idempotencyKey=this.newKey();},error:e=>this.error.set(e?.error?.message||this.i18n.t('rental.submitError'))});}
  phone():string{return this.settings()?.commercialContact?.phone||this.settings()?.contact?.phones?.[0]||'064/803 0973';} email():string{return this.settings()?.commercialContact?.email||this.settings()?.contact?.generalEmail||'sales@madlenianum.rs';} contactName():string{return this.settings()?.commercialContact?.contactName||'Jana Aksentijević';} responseText():string{return this.settings()?.commercialContact?.responseTimeText||(this.i18n.locale.isEnglish()?'our team will respond within 24 hours.':'naš tim će Vam odgovoriti u roku od 24 sata.');}
  private newKey():string{return `planning-${Date.now()}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`;}
}
