import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CmsOption } from '../../../core/models/cms.models';
import { SearchPickerComponent } from '../search-picker/search-picker.component';

@Component({selector:'app-recommended-productions-picker',standalone:true,imports:[FormsModule,SearchPickerComponent],templateUrl:'./recommended-productions-picker.component.html',styleUrl:'./recommended-productions-picker.component.scss',providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>RecommendedProductionsPickerComponent),multi:true}]})
export class RecommendedProductionsPickerComponent implements ControlValueAccessor{
  @Input() options:CmsOption[]=[];
  value:string[]=[];
  disabled=false;
  private onChange:(value:string[])=>void=()=>undefined;
  private onTouched:()=>void=()=>undefined;
  writeValue(value:string[]|null):void{this.value=Array.isArray(value)?value:[];}
  registerOnChange(fn:(value:string[])=>void):void{this.onChange=fn;}
  registerOnTouched(fn:()=>void):void{this.onTouched=fn;}
  setDisabledState(disabled:boolean):void{this.disabled=disabled;}
  update(value:string|string[]):void{this.value=Array.isArray(value)?value:[];this.onChange(this.value);this.onTouched();}
}
