import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { RentalSpace } from '../../../core/models/phase6a.models';
import { PublicGalleryItem } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicGalleryLightboxComponent } from '../../components/public-gallery-lightbox/public-gallery-lightbox.component';
import { PublicRentalInquiryFormComponent } from '../../components/public-rental-inquiry-form/public-rental-inquiry-form.component';
import { rentalSpaceImage } from '../../shared/rental-space-presentation';

@Component({selector:'app-public-rental-space-detail',standalone:true,imports:[CommonModule,RouterLink,PublicGalleryLightboxComponent,PublicRentalInquiryFormComponent],templateUrl:'./public-rental-space-detail.component.html',styleUrl:'./public-rental-space-detail.component.scss'})
export class PublicRentalSpaceDetailComponent implements OnInit,AfterViewInit {private readonly route=inject(ActivatedRoute);readonly api=inject(PublicApiService);readonly space=signal<RentalSpace|null>(null);readonly loading=signal(true);readonly error=signal('');readonly lightbox=signal<PublicGalleryItem[]|null>(null);ngOnInit():void{this.api.getRentalSpace(this.route.snapshot.paramMap.get('slug')||'').pipe(finalize(()=>this.loading.set(false))).subscribe({next:r=>this.space.set(r.item),error:e=>this.error.set(e?.error?.message||'Prostor nije pronađen.')});}ngAfterViewInit():void{if(this.route.snapshot.fragment==='upit')setTimeout(()=>document.getElementById('upit')?.scrollIntoView(),250);}image(value:unknown):string{const activeSpace=this.space();const mediaUrl=this.api.mediaUrl(value);return activeSpace&&value===activeSpace.heroImage?rentalSpaceImage(activeSpace.slug,mediaUrl):mediaUrl||'/madlenianum/zakup_prostora/Foaje.jpg';}openGallery(index:number):void{const items=this.space()?.galleryItems||[];this.lightbox.set([...items.slice(index),...items.slice(0,index)]);}floorPlan(space:RentalSpace):string{return this.api.mediaUrl(space.floorPlanPdf);}}
