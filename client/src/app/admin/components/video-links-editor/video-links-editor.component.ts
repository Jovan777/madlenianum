import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MediaSelectionResult, MediaSelectionValue } from '../../../core/models/media.models';
import { MediaPickerComponent } from '../media-picker/media-picker.component';

@Component({ selector:'app-video-links-editor',standalone:true,imports:[CommonModule,ReactiveFormsModule,MediaPickerComponent],templateUrl:'./video-links-editor.component.html',styleUrl:'./video-links-editor.component.scss' })
export class VideoLinksEditorComponent {
  @Input({required:true}) array!:FormArray;
  @Input() providers:Array<{value:string;label:string}>=[];
  constructor(private readonly fb:FormBuilder){}
  groups():FormGroup[]{return this.array.controls as FormGroup[];}
  add(value:Record<string,unknown>={}):void{this.array.push(this.fb.group({provider:[String(value['provider']||'youtube'),Validators.required],url:[String(value['url']||''),[Validators.required,Validators.pattern(/^https?:\/\//i)]],title:[String(value['title']||'')],thumbnail:[String(value['thumbnail']||'')],isTrailer:[Boolean(value['isTrailer'])],displayOrder:[this.array.length]}));this.array.markAsDirty();}
  setTrailer(index:number):void{this.array.controls.forEach((item,itemIndex)=>item.get('isTrailer')?.setValue(itemIndex===index));this.array.markAsDirty();}
  thumbnailValue(group:FormGroup):MediaSelectionValue[]{const value=group.get('thumbnail')?.value;return value?[value]:[];}
  updateThumbnail(group:FormGroup,selection:MediaSelectionResult):void{group.get('thumbnail')?.setValue(selection.ids[0]||'');group.markAsDirty();}
  remove(index:number):void{this.array.removeAt(index);this.normalize();}
  move(index:number,direction:-1|1):void{const target=index+direction;if(target<0||target>=this.array.length)return;const item=this.array.at(index);this.array.removeAt(index);this.array.insert(target,item);this.normalize();}
  private normalize():void{this.array.controls.forEach((item,index)=>item.get('displayOrder')?.setValue(index));this.array.markAsDirty();}
}
