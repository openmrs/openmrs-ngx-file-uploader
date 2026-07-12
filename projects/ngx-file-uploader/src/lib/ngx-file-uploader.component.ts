import { CommonModule } from '@angular/common';
import { Component, EventEmitter, forwardRef, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import {
  ButtonModule,
  FileUploaderModule,
  IconModule,
  NotificationModule,
  RadioModule,
} from 'carbon-components-angular';
import { Subject, Observable } from 'rxjs';
import { WebcamImage, WebcamInitError, WebcamUtil, WebcamModule } from 'ngx-webcam';
import jsPDF from 'jspdf';

const noop = () => {};

type SelectedFileType = 'image' | 'pdf' | 'webcam' | '';

export type FilePayload = {
  data: string | ArrayBuffer | null;
  id: number;
  name: string;
  size: number;
};

@Component({
  selector: 'lib-ngx-file-uploader',
  styleUrls: ['./ngx-file-uploader.component.scss'],
  templateUrl: './ngx-file-uploader.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NgxFileUploaderComponent),
      multi: true,
    },
  ],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    WebcamModule,
    ButtonModule,
    FileUploaderModule,
    IconModule,
    NotificationModule,
    RadioModule,
  ],
})
export class NgxFileUploaderComponent implements ControlValueAccessor, OnInit, OnDestroy {
  public selectedItems: Array<FilePayload | WebcamImage> = [];
  public showTypeSelector = true;
  public uploadQueue: Array<FilePayload | WebcamImage> = [];
  public acceptedMimeTypes = '';
  public message = '';
  public pdfCreated = false;
  public notificationKind: 'danger' | 'success' | 'warning' | '' = '';
  public webcamMode = false;
  public hasPdfSelection = false;
  public showUploadActions = false;
  @Input() public singleFile = false;
  @Input() public formEntry = false;
  @Input() public srcUrl = '';
  @Input() public pdfFileName = 'merged-images.pdf';
  public allowMultiple = true;
  public showFileUploader = false;
  public selectedFileType: SelectedFileType = '';
  public showBackButton = false;
  @Input() public source: string | null = null;
  @Output() public fileChanged: EventEmitter<FilePayload> = new EventEmitter();
  @Output()
  public uploadData: EventEmitter<Array<FilePayload | WebcamImage>> = new EventEmitter();
  @Output() public cleared: EventEmitter<void> = new EventEmitter();
  public showWebcam = true;
  public allowCameraSwitch = true;
  public multipleWebcamsAvailable = false;
  public deviceId = '';
  public videoOptions: MediaTrackConstraints = {};
  public errors: WebcamInitError[] = [];

  private trigger: Subject<void> = new Subject<void>();
  private nextWebcam: Subject<boolean | string> = new Subject<boolean | string>();
  public uploading = false;
  public carbonFiles = new Set<unknown>();
  private innerValue: string | null = '';
  private messageTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private filePayloadCache = new Map<string, FilePayload>();
  private readGeneration = 0;

  private onTouchedCallback: () => void = noop;
  private onChangeCallback: (_: string | null) => void = noop;

  public ngOnInit() {
    if (this.singleFile) {
      this.allowMultiple = false;
    }
    WebcamUtil.getAvailableVideoInputs().then((mediaDevices: MediaDeviceInfo[]) => {
      this.multipleWebcamsAvailable = mediaDevices && mediaDevices.length > 1;
    });
  }

  get value(): string | null {
    return this.innerValue;
  }

  set value(v: string | null) {
    if (v !== this.innerValue) {
      this.innerValue = v;
      this.onChangeCallback(v);
    }
  }

  public writeValue(value: string | null) {
    if (value !== this.innerValue) {
      this.innerValue = value;
    }
  }

  public registerOnChange(fn: (_: string | null) => void) {
    this.onChangeCallback = fn;
  }

  public registerOnTouched(fn: () => void) {
    this.onTouchedCallback = fn;
  }

  public messageViewTimeout() {
    if (this.messageTimeoutId) {
      clearTimeout(this.messageTimeoutId);
    }
    this.messageTimeoutId = setTimeout(() => {
      this.message = '';
      this.notificationKind = '';
      this.messageTimeoutId = null;
    }, 12000);
  }

  private clearNotification() {
    if (this.messageTimeoutId) {
      clearTimeout(this.messageTimeoutId);
      this.messageTimeoutId = null;
    }
    this.message = '';
    this.notificationKind = '';
  }

  public ngOnDestroy() {
    if (this.messageTimeoutId) {
      clearTimeout(this.messageTimeoutId);
      this.messageTimeoutId = null;
    }
  }

  public clear() {
    this.clearSelection();
    this.resetView();
    this.onTouchedCallback();
  }

  private clearSelection() {
    this.readGeneration++;
    this.value = '';
    this.selectedItems = [];
    this.uploadQueue = [];
    this.carbonFiles = new Set();
    this.filePayloadCache.clear();
    this.pdfCreated = false;
    this.uploading = false;
    this.clearNotification();
    this.cleared.emit();
  }

  public resetView() {
    this.readGeneration++;
    this.showTypeSelector = true;
    this.selectedItems = [];
    this.showBackButton = false;
    this.uploadQueue = [];
    this.showUploadActions = false;
    this.hasPdfSelection = false;
    this.showFileUploader = false;
    this.webcamMode = false;
    this.pdfCreated = false;
    this.uploading = false;
    this.selectedFileType = '';
    this.carbonFiles = new Set();
    this.filePayloadCache.clear();
    this.clearNotification();
  }

  public setUploadMode(filetype: SelectedFileType) {
    this.selectedFileType = filetype;
    if (this.value) {
      this.clearSelection();
    }
    this.allowMultiple = !this.singleFile;
    this.hasPdfSelection = filetype === 'pdf';
    this.webcamMode = filetype === 'webcam';
    if (filetype === 'image') {
      if (this.formEntry) {
        this.message = 'Images will be merged into a single PDF when uploaded in form entry mode.';
        this.notificationKind = 'warning';
        this.messageViewTimeout();
      }
      this.acceptedMimeTypes = 'image/png, image/jpeg, image/gif';
      this.showFileUploader = true;
    } else if (filetype === 'pdf') {
      if (this.formEntry) {
        this.allowMultiple = false;
      }
      this.acceptedMimeTypes = 'application/pdf';
      this.showFileUploader = true;
    } else if (filetype === 'webcam') {
      this.showFileUploader = false;
    }
    this.showTypeSelector = false;
    this.showBackButton = true;
  }

  public async upload() {
    if (!this.pdfCreated) {
      if (this.formEntry && this.hasPdfSelection === false) {
        const merged = await this.mergeImages();
        if (!merged) {
          return;
        }
      }
    }
    if (this.uploadQueue.length === 0) {
      return;
    }
    this.uploadData.emit(this.uploadQueue);
    this.resetView();
  }

  public get canMergeImages(): boolean {
    return this.selectedItems.some((item) => this.isImageItem(item));
  }

  private getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  public async mergeImages(): Promise<boolean> {
    const imageDataUrls = this.uploadQueue
      .map((item) => this.getImageDataUrl(item))
      .filter((dataUrl): dataUrl is string => typeof dataUrl === 'string');
    if (imageDataUrls.length === 0) {
      this.message = 'No images available to merge';
      this.notificationKind = 'danger';
      this.messageViewTimeout();
      return false;
    }
    const doc = new jsPDF({ compress: true });
    let currentPage = 1;

    const maxWidth = 190;
    const maxHeight = 270;
    const marginX = 10;
    const marginY = 10;

    for (let i = 0; i < imageDataUrls.length; i++) {
      const imageData = imageDataUrls[i];

      const dimensions = await this.getImageDimensions(imageData);
      const imgAspectRatio = dimensions.width / dimensions.height;
      const pageAspectRatio = maxWidth / maxHeight;

      let imgWidth: number;
      let imgHeight: number;

      if (imgAspectRatio > pageAspectRatio) {
        imgWidth = maxWidth;
        imgHeight = maxWidth / imgAspectRatio;
      } else {
        imgHeight = maxHeight;
        imgWidth = maxHeight * imgAspectRatio;
      }

      const x = marginX + (maxWidth - imgWidth) / 2;
      const y = marginY + (maxHeight - imgHeight) / 2;

      doc.addImage(imageData, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'FAST');
      doc.setFont('courier', 'normal');
      doc.text('page ' + currentPage, 180, 290);

      if (i < imageDataUrls.length - 1) {
        doc.addPage();
        currentPage++;
      }
    }

    doc.setProperties({
      title: 'OpenMRS File Upload',
    });

    const nextId = this.selectedItems.length + 1;
    this.uploadQueue = [];
    this.selectedItems = [];
    const output = doc.output('datauristring');
    const data = output.replace(/filename=.*?\.pdf;/gi, '');
    const payload: FilePayload = {
      data,
      id: nextId,
      name: this.normalizePdfFileName(),
      size: this.getDataSizeKb(data),
    };
    this.message = 'Images were merged into a single PDF. You can upload it now.';
    this.notificationKind = 'success';
    this.messageViewTimeout();
    this.uploadQueue.push(payload);
    this.selectedItems.push(payload);
    this.showUploadActions = true;
    this.pdfCreated = true;
    return true;
  }

  private normalizePdfFileName(): string {
    if (!this.pdfFileName) {
      return 'merged-images.pdf';
    }
    const trimmed = `${this.pdfFileName}`.trim();
    if (!trimmed) {
      return 'merged-images.pdf';
    }
    return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
  }

  public triggerSnapshot(): void {
    this.showUploadActions = true;
    this.trigger.next();
    this.onTouchedCallback();
  }

  public handleInitError(error: WebcamInitError): void {
    this.errors.push(error);
  }

  public showNextWebcam(directionOrDeviceId: boolean | string): void {
    this.nextWebcam.next(directionOrDeviceId);
  }

  public handleImage(webcamImage: WebcamImage): void {
    const payload = this.buildWebcamPayload(webcamImage);
    if (this.singleFile) {
      this.selectedItems = [];
      this.uploadQueue = [];
      this.pushData(payload);
      return;
    }
    this.pushData(payload);
  }

  public pushData(item: FilePayload | WebcamImage) {
    this.selectedItems.push(item);
    this.uploadQueue.push(item);
  }

  public onCarbonFilesChange(files: Set<unknown>) {
    this.onTouchedCallback();
    this.carbonFiles = files ?? new Set();
    const fileItems = Array.from(this.carbonFiles);
    const selectedFiles = fileItems
      .map((item) => this.extractFile(item))
      .filter((file): file is File => file instanceof File);
    if (selectedFiles.length === 0) {
      this.clearSelection();
      return;
    }
    this.pruneFileCache(selectedFiles);
    this.handleSelectedFiles(selectedFiles, { replace: true });
  }

  public get notificationType(): 'error' | 'success' | 'warning' | 'info' {
    switch (this.notificationKind) {
      case 'danger':
        return 'error';
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  }

  public get notificationTitle(): string {
    switch (this.notificationKind) {
      case 'danger':
        return 'Error';
      case 'success':
        return 'Success';
      case 'warning':
        return 'Warning';
      default:
        return 'Info';
    }
  }

  private handleSelectedFiles(files: File[], options: { replace: boolean } = { replace: false }) {
    if (!files || files.length === 0) {
      this.uploading = false;
      return;
    }
    const nextFiles = this.allowMultiple ? files : files.slice(0, 1);
    let pendingReads = 0;
    let nextId = this.selectedItems.length + 1;
    if (this.selectedFileType === 'webcam') {
      this.showUploadActions = true;
    }
    if (options.replace) {
      this.selectedItems = [];
      this.uploadQueue = [];
      nextId = 1;
    }
    const cachedPayloads: FilePayload[] = [];
    for (const file of nextFiles) {
      const key = this.buildFileKey(file);
      const cached = this.filePayloadCache.get(key);
      if (cached) {
        cachedPayloads.push(cached);
        continue;
      }
      pendingReads += 1;
    }
    if (cachedPayloads.length > 0) {
      if (this.singleFile) {
        const payload = cachedPayloads[0];
        this.fileChanged.emit(payload);
        this.resetView();
        return;
      }
      this.selectedItems.push(...cachedPayloads);
      this.uploadQueue.push(...cachedPayloads);
      nextId = this.selectedItems.length + 1;
    }
    const generation = this.readGeneration;
    this.uploading = pendingReads > 0;
    for (const file of nextFiles) {
      const key = this.buildFileKey(file);
      if (this.filePayloadCache.has(key)) {
        continue;
      }
      const fileReader = new FileReader();
      if (this.selectedFileType === 'pdf' && this.formEntry) {
        this.selectedItems = [];
        this.uploadQueue = [];
        nextId = 1;
      }
      fileReader.onload = () => {
        if (this.readGeneration !== generation) {
          return;
        }
        const data = fileReader.result;
        const name = file.name;
        const fileSize = Math.round(file.size / 1024);
        if (fileSize >= 3072) {
          this.message = `${name} exceeds the 3MB limit and was skipped.`;
          this.notificationKind = 'danger';
          this.messageViewTimeout();
        } else {
          const payload: FilePayload = {
            data,
            id: nextId,
            name: name,
            size: fileSize,
          };
          this.filePayloadCache.set(key, payload);
          if (!this.singleFile) {
            this.selectedItems.push(payload);
            this.uploadQueue.push(payload);
            nextId = this.selectedItems.length + 1;
          } else {
            this.fileChanged.emit(payload);
            this.resetView();
          }
        }
        pendingReads -= 1;
        if (pendingReads === 0) {
          this.uploading = false;
        }
      };
      fileReader.onerror = () => {
        pendingReads -= 1;
        if (pendingReads === 0) {
          this.uploading = false;
        }
      };
      fileReader.readAsDataURL(file);
    }
  }

  private getImageDataUrl(item: FilePayload | WebcamImage): string | null {
    if ('imageAsDataUrl' in item) {
      return item.imageAsDataUrl ?? null;
    }
    if (typeof item.data === 'string' && item.data.startsWith('data:image/')) {
      return item.data;
    }
    return null;
  }

  private isImageItem(item: FilePayload | WebcamImage): boolean {
    return this.getImageDataUrl(item) !== null;
  }

  private getDataSizeKb(dataUrl: string): number {
    const base64Index = dataUrl.indexOf('base64,');
    if (base64Index === -1) {
      return 0;
    }
    const base64 = dataUrl.slice(base64Index + 'base64,'.length);
    return Math.round((base64.length * 3) / 4 / 1024);
  }

  private buildWebcamPayload(webcamImage: WebcamImage): FilePayload {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = `webcam-${timestamp}.jpg`;
    return {
      data: webcamImage.imageAsDataUrl,
      id: this.selectedItems.length + 1,
      name,
      size: this.getDataSizeKb(webcamImage.imageAsDataUrl),
    };
  }

  private extractFile(item: unknown): File | null {
    if (item instanceof File) {
      return item;
    }
    if (item && typeof item === 'object' && 'file' in item) {
      const possibleFile = (item as { file?: unknown }).file;
      if (possibleFile instanceof File) {
        return possibleFile;
      }
    }
    return null;
  }

  private pruneFileCache(files: File[]) {
    const keys = new Set(files.map((file) => this.buildFileKey(file)));
    for (const key of this.filePayloadCache.keys()) {
      if (!keys.has(key)) {
        this.filePayloadCache.delete(key);
      }
    }
  }

  private buildFileKey(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`;
  }

  public get fileUploaderTitle(): string {
    const kind = this.getUploaderKindLabel();
    return this.allowMultiple ? `Upload ${kind.plural}` : `Upload ${kind.singular}`;
  }

  public get fileUploaderDescription(): string {
    const kind = this.getUploaderKindLabel();
    const base = this.allowMultiple
      ? `Drag and drop or select ${kind.plural}`
      : `Drag and drop or select a ${kind.singular}`;
    return `${base} (max 3MB)`;
  }

  private getUploaderKindLabel(): { singular: string; plural: string } {
    switch (this.selectedFileType) {
      case 'image':
        return { singular: 'image', plural: 'images' };
      case 'pdf':
        return { singular: 'PDF', plural: 'PDFs' };
      default:
        return { singular: 'file', plural: 'files' };
    }
  }

  public cameraWasSwitched(deviceId: string): void {
    this.deviceId = deviceId;
  }

  public get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }

  public get nextWebcamObservable(): Observable<boolean | string> {
    return this.nextWebcam.asObservable();
  }

  public openCurrentFile() {
    const file = this.srcUrl || this.value;
    if (!file) {
      return;
    }
    const newWindow = window.open(file, '_blank', 'noopener,noreferrer');
    if (newWindow) {
      newWindow.opener = null;
    }
  }
}
