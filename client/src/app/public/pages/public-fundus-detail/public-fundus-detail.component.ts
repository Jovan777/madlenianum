import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';

import { conditionLabel, costumeGenderLabel, propTypeLabel } from '../../../core/models/phase6a-labels';
import { CostumeItem, Phase6AItemResponse, PropScenographyItem } from '../../../core/models/phase6a.models';
import { PublicGalleryItem, PublicSiteSettings } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicGalleryLightboxComponent } from '../../components/public-gallery-lightbox/public-gallery-lightbox.component';

@Component({selector:'app-public-fundus-detail',standalone:true,imports:[CommonModule,RouterLink,PublicGalleryLightboxComponent],templateUrl:'./public-fundus-detail.component.html',styleUrl:'./public-fundus-detail.component.scss'})
export class PublicFundusDetailComponent implements OnInit {
  private readonly route=inject(ActivatedRoute);readonly api=inject(PublicApiService);readonly item=signal<CostumeItem|PropScenographyItem|null>(null);readonly settings=signal<PublicSiteSettings|null>(null);readonly loading=signal(true);readonly error=signal('');readonly lightbox=signal<PublicGalleryItem[]|null>(null);readonly kind=signal<'costume'|'prop'>('costume');
  ngOnInit():void{const slug=this.route.snapshot.paramMap.get('slug')||'';this.kind.set(this.route.snapshot.data['kind']==='prop'?'prop':'costume');this.api.getSiteSettings().subscribe({next:r=>this.settings.set(r.item)});const request=(this.kind()==='costume'?this.api.getCostume(slug):this.api.getPropScenography(slug)) as Observable<Phase6AItemResponse<CostumeItem|PropScenographyItem>>;request.pipe(finalize(()=>this.loading.set(false))).subscribe({next:r=>this.item.set(r.item),error:e=>this.error.set(e?.error?.message||'Predmet nije pronađen.')});}
  isCostume(value:CostumeItem|PropScenographyItem):value is CostumeItem{return 'gender'in value;} image(value:unknown):string{return this.api.mediaUrl(value)||'/madlenianum/logo.png';} condition(value:string):string{return conditionLabel(value);} gender(value:string):string{return costumeGenderLabel(value);} type(value:string):string{return propTypeLabel(value);} contactPhone():string{return this.settings()?.fundusContact?.phone||this.settings()?.contact?.phones?.[0]||'';} contactEmail():string{return this.settings()?.fundusContact?.email||this.settings()?.contact?.generalEmail||'';} openGallery(index=0):void{const gallery=this.item()?.galleryItems||[];if(!gallery.length)return;this.lightbox.set([...gallery.slice(index),...gallery.slice(0,index)]);}
}
