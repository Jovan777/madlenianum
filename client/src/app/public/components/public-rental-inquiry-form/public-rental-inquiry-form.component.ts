import { CommonModule } from '@angular/common';
import { Component, OnChanges, SimpleChanges, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { RentalSpace } from '../../../core/models/phase6a.models';
import { PublicApiService } from '../../../core/services/public-api.service';

@Component({selector:'app-public-rental-inquiry-form',standalone:true,imports:[CommonModule,ReactiveFormsModule],templateUrl:'./public-rental-inquiry-form.component.html',styleUrl:'./public-rental-inquiry-form.component.scss'})
export class PublicRentalInquiryFormComponent implements OnChanges {
  readonly space=input.required<RentalSpace>();private readonly fb=inject(FormBuilder);private readonly api=inject(PublicApiService);readonly submitting=signal(false);readonly error=signal('');readonly reference=signal('');readonly emailWarning=signal(false);private idempotencyKey=this.newKey();
  readonly form=this.fb.nonNullable.group({firstName:['',[Validators.required,Validators.maxLength(80)]],lastName:['',[Validators.required,Validators.maxLength(80)]],companyName:[''],email:['',[Validators.required,Validators.email]],phone:['',Validators.required],desiredDate:[''],approximateGuestCount:this.fb.control<number|null>(null,[Validators.min(1)]),note:['']});
  ngOnChanges(changes:SimpleChanges):void{if(changes['space']){this.reference.set('');this.error.set('');}}
  submit():void{if(this.form.invalid||this.submitting())return this.form.markAllAsTouched();const raw=this.form.getRawValue();this.submitting.set(true);this.error.set('');this.api.createRentalInquiry({rentalSpace:this.space().id,...raw,desiredDate:raw.desiredDate||undefined,approximateGuestCount:raw.approximateGuestCount||undefined,idempotencyKey:this.idempotencyKey}).pipe(finalize(()=>this.submitting.set(false))).subscribe({next:response=>{this.reference.set(response.item.referenceNumber);this.emailWarning.set(['failed','not_configured'].includes(response.emailStatus||''));this.form.reset();this.idempotencyKey=this.newKey();},error:error=>this.error.set(error?.error?.message||'Upit nije moguće poslati. Proverite podatke i pokušajte ponovo.')});}
  resetSuccess():void{this.reference.set('');}
  private newKey():string{return `rental-${Date.now()}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`;}
}
