import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import type { WebcamImage } from 'ngx-webcam';
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
    // The rejected file is also dropped from the Carbon set, so it is no longer displayed.
    expect([...component.carbonFiles].map((item) => (item as { file: File }).file.name)).toEqual([
      'ok-1.png',
      'ok-2.png',
    ]);
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

  it('emits fileChanged (not uploadData) and resets in single-file picker mode', () => {
    component.singleFile = true;
    component.setUploadMode('image');
    fixture.detectChanges();
    const fileChangedSpy = spyOn(component.fileChanged, 'emit');
    const uploadDataSpy = spyOn(component.uploadData, 'emit');

    component.onCarbonFilesChange(new Set([{ file: makeFile('one.png', 1024) }]));

    expect(fileChangedSpy).toHaveBeenCalledTimes(1);
    expect((fileChangedSpy.calls.mostRecent().args[0] as FilePayload).name).toBe('one.png');
    expect(uploadDataSpy).not.toHaveBeenCalled();
    expect(component.showTypeSelector).toBeTrue();
  });

  it('serves a re-selected file from cache without reading it again', () => {
    component.setUploadMode('image');
    const file = makeFile('cached.png', 1024);
    const readSpy = spyOn(MockFileReader.prototype, 'readAsDataURL').and.callThrough();

    component.onCarbonFilesChange(new Set([{ file }]));
    expect(readSpy).toHaveBeenCalledTimes(1);
    expect(component.selectedItems.length).toBe(1);

    component.onCarbonFilesChange(new Set([{ file }]));
    expect(readSpy).toHaveBeenCalledTimes(1);
    expect(component.selectedItems.length).toBe(1);
  });

  it('merges queued images into a single PDF payload with a normalized name', async () => {
    const png = makePngDataUrl();
    component.pdfFileName = 'my-scan';
    component.uploadQueue = [
      { data: png, id: 1, name: 'a.png', size: 1 },
      { data: png, id: 2, name: 'b.png', size: 1 },
    ];
    component.selectedItems = [...component.uploadQueue];

    const merged = await component.mergeImages();

    expect(merged).toBeTrue();
    expect(component.uploadQueue.length).toBe(1);
    const pdf = component.uploadQueue[0] as FilePayload;
    expect(pdf.name).toBe('my-scan.pdf');
    expect(typeof pdf.data).toBe('string');
    expect((pdf.data as string).startsWith('data:application/pdf')).toBeTrue();
    expect(component.pdfCreated).toBeTrue();
  });

  it('normalizes a webcam capture into a FilePayload', () => {
    const capture = { imageAsDataUrl: 'data:image/jpeg;base64,ZZZ' } as unknown as WebcamImage;

    component.handleImage(capture);

    expect(component.uploadQueue.length).toBe(1);
    const payload = component.uploadQueue[0] as FilePayload;
    expect(payload.data).toBe('data:image/jpeg;base64,ZZZ');
    expect(payload.name).toMatch(/^webcam-.*\.jpg$/);
  });

  it('keeps only the latest capture in single-file webcam mode', () => {
    component.singleFile = true;
    const first = { imageAsDataUrl: 'data:image/jpeg;base64,AAA' } as unknown as WebcamImage;
    const second = { imageAsDataUrl: 'data:image/jpeg;base64,BBB' } as unknown as WebcamImage;

    component.handleImage(first);
    component.handleImage(second);

    expect(component.uploadQueue.length).toBe(1);
    expect((component.uploadQueue[0] as FilePayload).data).toBe('data:image/jpeg;base64,BBB');
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

// Renders a 1x1 PNG data URL via canvas so its chunk CRCs are valid for jsPDF/fast-png.
function makePngDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1, 1);
  }
  return canvas.toDataURL('image/png');
}
