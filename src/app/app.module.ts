import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NgxFileUploaderModule } from 'dist/ngx-file-uploader';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, CommonModule, FormsModule, NgxFileUploaderModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
