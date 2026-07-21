import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CmsListItem } from '../../../core/models/cms.models';
import { contentStatusLabel } from '../../../core/models/cms-labels';
import { CmsAdminService } from '../../../core/services/cms-admin.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';

@Component({selector:'app-admin-pages-list',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./admin-pages-list.component.html',styleUrl:'./admin-pages-list.component.scss'})
export class AdminPagesListComponent implements OnInit{
  private readonly cms=inject(CmsAdminService);private readonly notifications=inject(AdminNotificationService);readonly items=signal<CmsListItem[]>([]);readonly loading=signal(false);readonly error=signal('');q='';status='';
  ngOnInit():void{this.load();}load():void{this.loading.set(true);this.error.set('');this.cms.list<CmsListItem>('pages',{q:this.q,status:this.status,limit:100}).subscribe({next:(response)=>this.items.set(response.items),error:(error)=>this.error.set(error?.error?.message||'Strane nisu ucitane.'),complete:()=>this.loading.set(false)});}
  editor(item:CmsListItem):string[]{const id=String(item._id||item.id||'');if(item.pageType==='about')return['/admin/pages/about'];if(item.pageType==='contact')return['/admin/pages/contact'];return['/admin/pages',id,'edit'];}
  preview(item:CmsListItem):string[]{const id=String(item._id||item.id||'');if(item.pageType==='about')return['/admin/pages/about/preview'];if(item.pageType==='contact')return['/admin/pages/contact/preview'];return['/strana',item.slug||''];}
  archive(item:CmsListItem):void{const id=String(item._id||item.id||'');if(!id||!window.confirm(`Arhivirati stranu "${item.title}"?`))return;this.cms.archive('pages',id).subscribe({next:()=>{this.notifications.success('Strana je arhivirana.');this.load();},error:(error)=>this.notifications.error(error?.error?.message||'Arhiviranje nije uspelo.')});}
  statusLabel(value:string|undefined):string{return contentStatusLabel(value);}
}
