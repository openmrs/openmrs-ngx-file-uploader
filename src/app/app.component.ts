import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { NgxFileUploaderComponent } from '../../projects/ngx-file-uploader/src/lib/ngx-file-uploader.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [FormsModule, NgxFileUploaderComponent],
})
export class AppComponent {
  public dataModel;

  public upload() {
    this.dataModel = 'https://unsplash.it/200/300';
  }

  public clear() {
    this.dataModel = '';
    console.log('Clear');
  }
}
