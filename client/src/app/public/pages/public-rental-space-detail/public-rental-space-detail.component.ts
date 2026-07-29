import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, distinctUntilChanged, finalize, map, switchMap, tap } from 'rxjs';

import { RentalSpace } from '../../../core/models/phase6a.models';
import { PublicGalleryItem } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicGalleryLightboxComponent } from '../../components/public-gallery-lightbox/public-gallery-lightbox.component';
import { PublicRentalInquiryFormComponent } from '../../components/public-rental-inquiry-form/public-rental-inquiry-form.component';
import { PublicI18nService } from '../../i18n/public-i18n.service';
import { PublicTranslatePipe } from '../../i18n/public-translate.pipe';
import { rentalSpaceImage } from '../../shared/rental-space-presentation';

@Component({selector:'app-public-rental-space-detail',standalone:true,imports:[CommonModule,RouterLink,PublicGalleryLightboxComponent,PublicRentalInquiryFormComponent,PublicTranslatePipe],templateUrl:'./public-rental-space-detail.component.html',styleUrl:'./public-rental-space-detail.component.scss'})
export class PublicRentalSpaceDetailComponent implements OnInit,AfterViewInit {private readonly route=inject(ActivatedRoute);private readonly destroyRef=inject(DestroyRef);private readonly i18n=inject(PublicI18nService);readonly api=inject(PublicApiService);readonly locale=inject(PublicLocaleService);readonly space=signal<RentalSpace|null>(null);readonly loading=signal(true);readonly error=signal('');readonly lightbox=signal<PublicGalleryItem[]|null>(null);ngOnInit():void{this.route.paramMap.pipe(map(params=>params.get('slug')||''),distinctUntilChanged(),tap(()=>{this.loading.set(true);this.error.set('');this.space.set(null);this.lightbox.set(null);window.scrollTo({top:0,behavior:'auto'});}),switchMap(slug=>this.api.getRentalSpace(slug).pipe(catchError(e=>{this.error.set(e?.error?.message||this.i18n.t('rental.notFound'));return EMPTY;}),finalize(()=>this.loading.set(false)))),takeUntilDestroyed(this.destroyRef)).subscribe(r=>{this.space.set(r.item);this.locale.registerPageLinks({sr:`/zakup-prostora/${r.item.slugs?.sr||r.item.slug}`,en:r.item.slugs?.en?`/en/venue-rental/${r.item.slugs.en}`:'/en/venue-rental'});});}ngAfterViewInit():void{if(this.route.snapshot.fragment==='upit')setTimeout(()=>document.getElementById('upit')?.scrollIntoView(),250);}image(value:unknown):string{const activeSpace=this.space();const mediaUrl=this.api.mediaUrl(value);return activeSpace&&value===activeSpace.heroImage?rentalSpaceImage(activeSpace.slug,mediaUrl):mediaUrl||'/madlenianum/zakup_prostora/Foaje.jpg';}openGallery(index:number):void{const items=this.space()?.galleryItems||[];this.lightbox.set([...items.slice(index),...items.slice(0,index)]);}floorPlan(space:RentalSpace):string{return this.api.mediaUrl(space.floorPlanPdf);}}
