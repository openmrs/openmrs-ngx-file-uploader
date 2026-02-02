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
  public dataModel = '';
  public lastUploadCount = 0;
  public lastUploadNames: string[] = [];

  public get lastUploadLabel(): string {
    return this.lastUploadCount === 1 ? 'file' : 'files';
  }

  public onUpload(files: Array<{ name?: string }>) {
    this.lastUploadCount = files.length;
    this.lastUploadNames = files.map((file) => {
      const name = file?.name?.trim();
      return name ? name : 'File';
    });
  }

  public clear() {
    this.dataModel = '';
    this.lastUploadCount = 0;
    this.lastUploadNames = [];
  }
}
