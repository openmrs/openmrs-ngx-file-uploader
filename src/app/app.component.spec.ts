import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxFileUploaderComponent } from '../../projects/ngx-file-uploader/src/lib/ngx-file-uploader.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, NgxFileUploaderComponent, AppComponent],
    }).compileComponents();
  }));

  it('should create the app', () => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('updates summary when an upload occurs', () => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;

    component.onUpload([{ name: 'test.png' }, { name: 'scan.pdf' }]);

    expect(component.lastUploadCount).toBe(2);
    expect(component.lastUploadNames).toEqual(['test.png', 'scan.pdf']);
    expect(component.lastUploadLabel).toBe('files');
  });

  it('clears summary data when cleared', () => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;

    component.dataModel = 'file.pdf';
    component.lastUploadCount = 1;
    component.lastUploadNames = ['file.pdf'];

    component.clear();

    expect(component.dataModel).toBe('');
    expect(component.lastUploadCount).toBe(0);
    expect(component.lastUploadNames).toEqual([]);
  });

  it('shows summary only when an upload exists', () => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.demo-summary')).toBeNull();

    component.lastUploadCount = 1;
    component.lastUploadNames = ['test.png'];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.demo-summary')).toBeTruthy();
  });
});
