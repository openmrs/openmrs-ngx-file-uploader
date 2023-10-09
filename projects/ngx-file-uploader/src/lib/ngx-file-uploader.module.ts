import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebcamModule } from 'ngx-webcam';

import { NgxFileUploaderComponent } from './ngx-file-uploader.component';

@NgModule({
  imports: [CommonModule, FormsModule, WebcamModule],
  declarations: [NgxFileUploaderComponent],
  exports: [NgxFileUploaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class NgxFileUploaderModule {}
