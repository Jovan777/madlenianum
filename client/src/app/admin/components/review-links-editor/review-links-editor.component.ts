import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({selector:'app-review-links-editor',standalone:true,imports:[CommonModule,ReactiveFormsModule],templateUrl:'./review-links-editor.component.html',styleUrl:'./review-links-editor.component.scss'})
export class ReviewLinksEditorComponent{
  @Input({required:true}) array!:FormArray;
  constructor(private readonly fb:FormBuilder){}
  groups():FormGroup[]{return this.array.controls as FormGroup[];}
  add(value:Record<string,unknown>={}):void{this.array.push(this.fb.group({title:[String(value['title']||'')],publication:[String(value['publication']||'')],url:[String(value['url']||''),[Validators.required,Validators.pattern(/^https?:\/\//i)]],publishedAt:[this.dateValue(value['publishedAt'])],note:[String(value['note']||'')],displayOrder:[this.array.length]}));this.array.markAsDirty();}
  remove(index:number):void{this.array.removeAt(index);this.normalize();}
  move(index:number,direction:-1|1):void{const target=index+direction;if(target<0||target>=this.array.length)return;const item=this.array.at(index);this.array.removeAt(index);this.array.insert(target,item);this.normalize();}
  private normalize():void{this.array.controls.forEach((item,index)=>item.get('displayOrder')?.setValue(index));this.array.markAsDirty();}
  private dateValue(value:unknown):string{return value?new Date(String(value)).toISOString().slice(0,10):'';}
}
