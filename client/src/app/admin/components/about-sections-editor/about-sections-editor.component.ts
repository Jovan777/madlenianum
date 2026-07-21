import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GalleryItemInput } from '../../../core/models/cms.models';
import { MediaSelectionResult, MediaSelectionValue } from '../../../core/models/media.models';
import { MediaPickerComponent } from '../media-picker/media-picker.component';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { StructuredGalleryEditorComponent } from '../structured-gallery-editor/structured-gallery-editor.component';

export const buildAboutSection = (fb:FormBuilder,value:Record<string,unknown>={},index=0):FormGroup => fb.group({
  sectionType:[String(value['sectionType']||'text-image'),Validators.required],enabled:[value['enabled']!==false],heading:[String(value['heading']||'')],eyebrow:[String(value['eyebrow']||'')],subtitle:[String(value['subtitle']||'')],body:[String(value['body']||'')],image:[mediaId(value['image'])],backgroundImage:[mediaId(value['backgroundImage'])],imagePosition:[String(value['imagePosition']||'right')],caption:[String(value['caption']||'')],ctaLabel:[String(value['ctaLabel']||'')],ctaUrl:[String(value['ctaUrl']||'')],videoUrl:[String(value['videoUrl']||'')],videoTitle:[String(value['videoTitle']||'')],quote:[String(value['quote']||'')],authorName:[String(value['authorName']||'')],authorRole:[String(value['authorRole']||'')],timelineItems:fb.array(asObjects(value['timelineItems']).map((item,itemIndex)=>buildTimeline(fb,item,itemIndex))),featureItems:fb.array(asObjects(value['featureItems']).map((item,itemIndex)=>buildFeature(fb,item,itemIndex))),galleryItems:fb.control<GalleryItemInput[]>(galleryValue(value['galleryItems'])),displayOrder:[index]
});
const buildTimeline=(fb:FormBuilder,value:Record<string,unknown>,index:number)=>fb.group({period:[String(value['period']||''),Validators.required],title:[String(value['title']||''),Validators.required],description:[String(value['description']||'')],image:[mediaId(value['image'])],displayOrder:[index]});
const buildFeature=(fb:FormBuilder,value:Record<string,unknown>,index:number)=>fb.group({title:[String(value['title']||''),Validators.required],description:[String(value['description']||'')],iconKey:[String(value['iconKey']||'')],image:[mediaId(value['image'])],displayOrder:[index]});
const asObject=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const asObjects=(value:unknown):Record<string,unknown>[]=>Array.isArray(value)?value.map(asObject):[];
const mediaId=(value:unknown):string=>typeof value==='string'?value:String(asObject(value)['_id']||asObject(value)['id']||'');
const galleryValue=(value:unknown):GalleryItemInput[]=>asObjects(value).map((item,index)=>({media:item['media'] as MediaSelectionValue,caption:String(item['caption']||''),credit:String(item['credit']||''),altText:String(item['altText']||''),displayOrder:Number(item['displayOrder']??index)}));

@Component({selector:'app-about-sections-editor',standalone:true,imports:[CommonModule,ReactiveFormsModule,MediaPickerComponent,RichTextEditorComponent,StructuredGalleryEditorComponent],templateUrl:'./about-sections-editor.component.html',styleUrl:'./about-sections-editor.component.scss'})
export class AboutSectionsEditorComponent{
  @Input({required:true}) array!:FormArray;
  newType='text-image';
  readonly types=[['hero','Hero'],['text-image','Tekst i slika'],['timeline','Vremenska linija'],['features','Karakteristike'],['video','Video'],['quote','Citat'],['gallery','Galerija']];
  constructor(private readonly fb:FormBuilder){}
  groups():FormGroup[]{return this.array.controls as FormGroup[];}timeline(group:FormGroup):FormArray{return group.get('timelineItems') as FormArray;}features(group:FormGroup):FormArray{return group.get('featureItems') as FormArray;}rows(array:FormArray):FormGroup[]{return array.controls as FormGroup[];}
  addSection():void{this.array.push(buildAboutSection(this.fb,{sectionType:this.newType},this.array.length));this.array.markAsDirty();}
  removeSection(index:number):void{if(window.confirm('Ukloniti ovu sekciju?')){this.array.removeAt(index);this.normalize(this.array);}}
  move(array:FormArray,index:number,direction:-1|1):void{const target=index+direction;if(target<0||target>=array.length)return;const item=array.at(index);array.removeAt(index);array.insert(target,item);this.normalize(array);}
  addTimeline(group:FormGroup):void{const array=this.timeline(group);array.push(buildTimeline(this.fb,{},array.length));array.markAsDirty();}addFeature(group:FormGroup):void{const array=this.features(group);array.push(buildFeature(this.fb,{},array.length));array.markAsDirty();}
  removeRow(array:FormArray,index:number):void{array.removeAt(index);this.normalize(array);}
  selection(group:FormGroup,field:string):MediaSelectionValue[]{const value=group.get(field)?.value;return value?[value]:[];}updateMedia(group:FormGroup,field:string,selection:MediaSelectionResult):void{group.get(field)?.setValue(selection.ids[0]||'');group.markAsDirty();}
  typeLabel(value:unknown):string{return this.types.find((item)=>item[0]===value)?.[1]||String(value||'Sekcija');}
  private normalize(array:FormArray):void{array.controls.forEach((item,index)=>item.get('displayOrder')?.setValue(index));array.markAsDirty();}
}
