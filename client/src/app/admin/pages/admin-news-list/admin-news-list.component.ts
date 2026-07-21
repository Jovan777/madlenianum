import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CmsListItem } from '../../../core/models/cms.models';
import { contentStatusLabel } from '../../../core/models/cms-labels';
import { CmsAdminService } from '../../../core/services/cms-admin.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';
import { MediaUrlService } from '../../../core/services/media-url.service';

@Component({selector:'app-admin-news-list',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./admin-news-list.component.html',styleUrl:'./admin-news-list.component.scss'})
export class AdminNewsListComponent implements OnInit{
  private readonly cms=inject(CmsAdminService);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);private readonly notifications=inject(AdminNotificationService);readonly media=inject(MediaUrlService);
  readonly items=signal<CmsListItem[]>([]);readonly loading=signal(false);readonly error=signal('');readonly total=signal(0);readonly totalPages=signal(0);q='';status='';category='';featured='';from='';to='';page=1;
  readonly categories=[['','Sve kategorije'],['vest','Vest'],['kritika','Kritika'],['press','Press'],['akcija','Akcija'],['premijera','Premijera'],['najava','Najava'],['obavestenje','Obavestenje'],['promocija','Promocija'],['ostalo','Ostalo']];
  ngOnInit():void{const query=this.route.snapshot.queryParamMap;this.q=query.get('q')||'';this.status=query.get('status')||'';this.category=query.get('category')||'';this.featured=query.get('isFeatured')||'';this.from=query.get('from')||'';this.to=query.get('to')||'';this.page=Number(query.get('page'))||1;this.load();}
  load(reset=false):void{if(reset)this.page=1;this.router.navigate([],{relativeTo:this.route,queryParams:{q:this.q||null,status:this.status||null,category:this.category||null,isFeatured:this.featured||null,from:this.from||null,to:this.to||null,page:this.page>1?this.page:null},replaceUrl:true});this.loading.set(true);this.error.set('');this.cms.list<CmsListItem>('news',{q:this.q,status:this.status,category:this.category,isFeatured:this.featured||undefined,from:this.from,to:this.to,page:this.page,limit:20}).subscribe({next:(response)=>{this.items.set(response.items);this.total.set(response.pagination.total);this.totalPages.set(response.pagination.totalPages);},error:(error)=>this.error.set(error?.error?.message||'Lista vesti nije ucitana.'),complete:()=>this.loading.set(false)});}
  archive(item:CmsListItem):void{const id=this.id(item);if(!id||!window.confirm(`Arhivirati "${item.title}"?`))return;this.cms.archive('news',id).subscribe({next:()=>{this.notifications.success('Vest je arhivirana.');this.load();},error:(error)=>this.notifications.error(error?.error?.message||'Arhiviranje nije uspelo.')});}
  pageBy(delta:number):void{const next=this.page+delta;if(next<1||next>this.totalPages())return;this.page=next;this.load();}id(item:CmsListItem):string{return String(item._id||item.id||'');}image(item:CmsListItem):string{return this.media.resolve(item.image);}statusLabel(value:string|undefined):string{return contentStatusLabel(value);}
}
