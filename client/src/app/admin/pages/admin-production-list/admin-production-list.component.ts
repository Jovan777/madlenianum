import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CmsListItem } from '../../../core/models/cms.models';
import { PRODUCTION_TYPE_OPTIONS, contentStatusLabel, productionTypeLabel } from '../../../core/models/cms-labels';
import { CmsAdminService } from '../../../core/services/cms-admin.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';
import { MediaUrlService } from '../../../core/services/media-url.service';

@Component({selector:'app-admin-production-list',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./admin-production-list.component.html',styleUrl:'./admin-production-list.component.scss'})
export class AdminProductionListComponent implements OnInit{
  private readonly cms=inject(CmsAdminService);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);private readonly notifications=inject(AdminNotificationService);readonly media=inject(MediaUrlService);
  readonly items=signal<CmsListItem[]>([]);readonly loading=signal(false);readonly error=signal('');readonly total=signal(0);readonly totalPages=signal(0);q='';status='';type='';season='';featured='';announced='';page=1;
  readonly types=[['','Sve vrste'],...PRODUCTION_TYPE_OPTIONS.map((option)=>[option.value,option.label])];
  ngOnInit():void{const query=this.route.snapshot.queryParamMap;this.q=query.get('q')||'';this.status=query.get('status')||'';this.type=query.get('type')||'';this.season=query.get('season')||'';this.featured=query.get('isFeatured')||'';this.announced=query.get('isAnnounced')||'';this.page=Number(query.get('page'))||1;this.load();}
  load(reset=false):void{if(reset)this.page=1;this.syncUrl();this.loading.set(true);this.error.set('');this.cms.list<CmsListItem>('productions',{q:this.q,status:this.status,type:this.type,season:this.season,isFeatured:this.featured||undefined,isAnnounced:this.announced||undefined,page:this.page,limit:20,sort:'updated'}).subscribe({next:(response)=>{this.items.set(response.items);this.total.set(response.pagination.total);this.totalPages.set(response.pagination.totalPages);},error:(error)=>this.error.set(error?.error?.message||'Lista predstava nije ucitana.'),complete:()=>this.loading.set(false)});}
  archive(item:CmsListItem):void{const id=this.id(item);if(!id||!window.confirm(`Arhivirati "${item.title}"? Sadrzaj vise nece biti javno vidljiv.`))return;this.cms.archive('productions',id).subscribe({next:()=>{this.notifications.success('Predstava je arhivirana.');this.load();},error:(error)=>this.notifications.error(error?.error?.message||'Arhiviranje nije uspelo.')});}
  pageBy(delta:number):void{const next=this.page+delta;if(next<1||next>this.totalPages())return;this.page=next;this.load();}
  id(item:CmsListItem):string{return String(item._id||item.id||'');}image(item:CmsListItem):string{return this.media.resolve(item.poster);}statusLabel(value:string|undefined):string{return contentStatusLabel(value);}typeLabel(value:string|undefined):string{return productionTypeLabel(value);}
  private syncUrl():void{this.router.navigate([],{relativeTo:this.route,queryParams:{q:this.q||null,status:this.status||null,type:this.type||null,season:this.season||null,isFeatured:this.featured||null,isAnnounced:this.announced||null,page:this.page>1?this.page:null},replaceUrl:true});}
}
