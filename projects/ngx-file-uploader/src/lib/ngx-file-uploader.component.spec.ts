import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NgxFileUploaderComponent } from './ngx-file-uploader.component';

describe('NgxFileUploaderComponent', () => {
  let component: NgxFileUploaderComponent;
  let fixture: ComponentFixture<NgxFileUploaderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [NgxFileUploaderComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxFileUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
