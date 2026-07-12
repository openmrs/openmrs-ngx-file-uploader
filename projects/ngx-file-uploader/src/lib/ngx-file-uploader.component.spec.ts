import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FilePayload, NgxFileUploaderComponent } from './ngx-file-uploader.component';

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

  it('skips only the oversized file and keeps the valid selection on the picker', () => {
    component.setUploadMode('image');
    fixture.detectChanges();

    component.onCarbonFilesChange(
      new Set([
        { file: makeFile('ok-1.png', 1024) },
        { file: makeFile('ok-2.png', 2048) },
        { file: makeFile('too-big.png', 4 * 1024 * 1024) },
      ])
    );
    fixture.detectChanges();

    expect((component.selectedItems as FilePayload[]).map((item) => item.name)).toEqual(['ok-1.png', 'ok-2.png']);
    expect(component.uploadQueue.length).toBe(2);
    // View is not reset back to the type selector.
    expect(component.showTypeSelector).toBeFalse();
    expect(component.showFileUploader).toBeTrue();
    // The rejection notice keeps its error styling and names the skipped file.
    expect(component.notificationKind).toBe('danger');
    expect(component.message).toContain('too-big.png');
  });

  it('clears the notification message and kind on resetView', () => {
    component.message = 'stale message';
    component.notificationKind = 'success';

    component.resetView();

    expect(component.message).toBe('');
    expect(component.notificationKind).toBe('');
  });

  it('clears the notification message and kind on clear', () => {
    component.message = 'stale message';
    component.notificationKind = 'success';

    component.clear();

    expect(component.message).toBe('');
    expect(component.notificationKind).toBe('');
  });

  it('shows the form-entry merge notice as a warning, not an error', () => {
    component.formEntry = true;

    component.setUploadMode('image');
    fixture.detectChanges();

    expect(component.notificationKind).toBe('warning');
    expect(component.message).toContain('merged');
  });
});

function findButtonByText(root: HTMLElement, text: string): HTMLButtonElement | null {
  const buttons = Array.from(root.querySelectorAll('button'));
  return buttons.find((btn) => btn.textContent?.trim() === text) as HTMLButtonElement | null;
}

// Builds a File with a controlled size without allocating its bytes.
function makeFile(name: string, size: number): File {
  const file = new File(['x'], name, { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}
