import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';

import { RentalSpace } from '../../../core/models/phase6a.models';
import { PublicSiteSettings } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicEventPlanningFormComponent } from '../../components/public-event-planning-form/public-event-planning-form.component';

@Component({selector:'app-public-rental-spaces',standalone:true,imports:[CommonModule,RouterLink,PublicEventPlanningFormComponent],templateUrl:'./public-rental-spaces.component.html',styleUrl:'./public-rental-spaces.component.scss'})
export class PublicRentalSpacesComponent implements OnInit {readonly api=inject(PublicApiService);readonly spaces=signal<RentalSpace[]>([]);readonly settings=signal<PublicSiteSettings|null>(null);readonly loading=signal(true);readonly error=signal('');ngOnInit():void{forkJoin({spaces:this.api.getRentalSpaces({limit:30,sort:'display'}),settings:this.api.getSiteSettings()}).pipe(finalize(()=>this.loading.set(false))).subscribe({next:r=>{this.spaces.set(r.spaces.items);this.settings.set(r.settings.item);},error:e=>this.error.set(e?.error?.message||'Prostori za zakup trenutno nisu dostupni.')});} image(space:RentalSpace):string{return this.api.mediaUrl(space.heroImage)||'/madlenianum/zakup_prostora/Foaje.jpg';} scrollToPlanning():void{document.getElementById('planiranje')?.scrollIntoView({behavior:'smooth'});}}
