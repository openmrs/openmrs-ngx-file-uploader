import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NgxFileUploaderComponent } from './ngx-file-uploader.component';

describe('NgxFileUploaderComponent', () => {
  let component: NgxFileUploaderComponent;
  let fixture: ComponentFixture<NgxFileUploaderComponent>;
  const originalFileReader = (globalThis as typeof globalThis).FileReader;

  class MockFileReader {
    public result: string | ArrayBuffer | null = null;
    public onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null;
    public onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null;

    public readAsDataURL() {
      this.result = 'data:image/png;base64,AAA';
      if (this.onload) {
        this.onload.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
      }
    }
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NgxFileUploaderComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    (globalThis as typeof globalThis).FileReader = MockFileReader as unknown as typeof FileReader;
    fixture = TestBed.createComponent(NgxFileUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    (globalThis as typeof globalThis).FileReader = originalFileReader;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows file uploader when Image mode is selected', () => {
    component.setUploadMode('image');
    fixture.detectChanges();

    const uploader = fixture.nativeElement.querySelector('cds-file-uploader');
    expect(uploader).toBeTruthy();
    expect(component.showFileUploader).toBeTrue();
  });

  it('disables Upload button until a file is selected', () => {
    component.setUploadMode('image');
    fixture.detectChanges();

    const uploadButton = findButtonByText(fixture.nativeElement, 'Upload');
    expect(uploadButton).toBeTruthy();
    expect(uploadButton.disabled).toBeTrue();

    const file = new File(['hello'], 'test.png', { type: 'image/png' });
    component.onCarbonFilesChange(new Set([{ file }]));
    fixture.detectChanges();

    expect(component.selectedItems.length).toBe(1);
    expect(uploadButton.disabled).toBeFalse();
  });

  it('forces single file selection in PDF mode when formEntry is true', () => {
    component.formEntry = true;
    component.setUploadMode('pdf');
    fixture.detectChanges();

    expect(component.allowMultiple).toBeFalse();
    expect(component.acceptedMimeTypes).toBe('application/pdf');
  });

  it('shows webcam UI and hides uploader in Webcam mode', () => {
    component.setUploadMode('webcam');
    fixture.detectChanges();

    const webcam = fixture.nativeElement.querySelector('webcam');
    const uploader = fixture.nativeElement.querySelector('cds-file-uploader');
    expect(component.webcamMode).toBeTrue();
    expect(webcam).toBeTruthy();
    expect(uploader).toBeFalsy();
  });

  it('shows "Merge images to PDF" only when images are selected', () => {
    component.setUploadMode('image');
    component.selectedItems = [
      {
        data: 'data:image/png;base64,AAA',
        id: 1,
        name: 'test.png',
        size: 1,
      },
    ];
    fixture.detectChanges();

    const mergeButton = findButtonByText(
      fixture.nativeElement,
      'Merge images to PDF'
    );
    expect(mergeButton).toBeTruthy();

    component.selectedItems = [
      { data: 'data:application/pdf;base64,AAA', id: 1, name: 'x.pdf', size: 1 },
    ];
    fixture.detectChanges();

    const mergeButtonAfter = findButtonByText(
      fixture.nativeElement,
      'Merge images to PDF'
    );
    expect(mergeButtonAfter).toBeFalsy();
  });

  it('calls mergeImages before upload when formEntry requires it', async () => {
    component.formEntry = true;
    component.hasPdfSelection = false;
    component.selectedItems = [
      {
        data: 'data:image/png;base64,AAA',
        id: 1,
        name: 'test.png',
        size: 1,
      },
    ];
    component.uploadQueue = [...component.selectedItems];
    const mergeSpy = spyOn(component, 'mergeImages').and.returnValue(Promise.resolve(true));

    await component.upload();

    expect(mergeSpy).toHaveBeenCalled();
  });

  it('emits cleared when cleared', () => {
    const clearSpy = spyOn(component.cleared, 'emit');
    component.clear();
    expect(clearSpy).toHaveBeenCalled();
  });
});

function findButtonByText(root: HTMLElement, text: string): HTMLButtonElement | null {
  const buttons = Array.from(root.querySelectorAll('button'));
  return buttons.find((btn) => btn.textContent?.trim() === text) as HTMLButtonElement | null;
}
