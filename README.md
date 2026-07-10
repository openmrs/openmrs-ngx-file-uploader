# OpenMRS file uploader

Angular component for selecting and preparing files in OpenMRS O3 forms. It supports PNG, JPEG, GIF, and PDF files, optional image-to-PDF merging, and webcam capture. It is designed for use with the [O3 Angular form engine](https://github.com/openmrs/openmrs-ngx-formentry) and its [file fields](https://ampath-forms.vercel.app/docs/field-types-reference#file).

This library does not send files to a server. It reads or captures files in the browser and emits payloads for the host application to upload.

## Installation

```bash
yarn add @openmrs/ngx-file-uploader
```

The host application must use Angular 20 and satisfy the peer dependency ranges in the [library package manifest](projects/ngx-file-uploader/package.json). An Angular 20 application that already provides the core Angular packages can install the remaining runtime and UI packages with:

```bash
yarn add carbon-components-angular@^5.62.1 @carbon/styles@^1.98.0 @carbon/icons@^11.73.0 \
  jspdf@^4.0.0 ngx-webcam@^0.4.1
```

IBM Plex is not a peer dependency, but the style configuration below expects its font files:

```bash
yarn add @ibm/plex@^6.4.1
```

## Compatibility

This library is part of the O3 Angular form engine stack together with [openmrs-ngx-formentry](https://github.com/openmrs/openmrs-ngx-formentry) and [esm-form-entry-app](https://github.com/openmrs/openmrs-esm-patient-chart/tree/main/packages/esm-form-entry-app). All three must use the same Angular major version.

The library's major version matches the Angular major it supports. For example, version 20.x supports Angular 20.

## Styles

Include Carbon styles and make the IBM Plex fonts available. Add the following to the host application's global styles, such as `src/styles.scss`:

```scss
@use '@carbon/styles/scss/config' with (
  $use-flexbox-grid: true,
  $css--font-face: true,
  $font-path: '/assets/fonts/plex'
);

@use '@carbon/styles';
```

Copy the `@ibm/plex` package contents to `/assets/fonts/plex` through the Angular `assets` configuration.

## Usage

The component is standalone. Import both `FormsModule`, for `ngModel`, and `NgxFileUploaderComponent` into the consuming standalone component:

```typescript
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FilePayload, NgxFileUploaderComponent } from '@openmrs/ngx-file-uploader';
import type { WebcamImage } from 'ngx-webcam';

@Component({
  selector: 'app-file-upload-example',
  standalone: true,
  imports: [FormsModule, NgxFileUploaderComponent],
  template: `
    <lib-ngx-file-uploader [(ngModel)]="storedFile" (uploadData)="onUpload($event)" (cleared)="onClear()" />
  `,
})
export class FileUploadExampleComponent {
  storedFile: string | null = null;

  onUpload(files: Array<FilePayload | WebcamImage>) {
    // Send the payloads to the backend, then assign the returned file
    // identifier or URL to storedFile.
  }

  onClear() {
    this.storedFile = null;
  }
}
```

`ngModel` represents the stored file identifier or URL. It does not contain the newly selected local file. The host application must assign the stored value after its upload request succeeds.

### Single-file picker mode

For a file selected from the image or PDF picker, `singleFile` emits `fileChanged` immediately instead of waiting for the Upload button and emitting `uploadData`:

```html
<lib-ngx-file-uploader [singleFile]="true" (fileChanged)="onFileChanged($event)" />
```

Webcam snapshots continue through the `uploadData` flow, including when `singleFile` is enabled.

## Inputs

| Input         | Type             | Default             | Behavior                                                                                                                                            |
| ------------- | ---------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `singleFile`  | `boolean`        | `false`             | Restricts picker selection to one file and emits that selection through `fileChanged`.                                                              |
| `formEntry`   | `boolean`        | `false`             | Automatically converts selected images or webcam captures into one PDF before `uploadData` is emitted. It also restricts PDF selection to one file. |
| `pdfFileName` | `string`         | `merged-images.pdf` | Sets the name of a PDF created by merging images. A `.pdf` extension is added when missing.                                                         |
| `srcUrl`      | `string`         | `''`                | Overrides the URL opened by **View current file**. When empty, the component opens the stored `ngModel` value.                                      |
| `source`      | `string \| null` | `null`              | Currently unused and has no effect.                                                                                                                 |

## Outputs

| Output        | Type                                              | Emitted when                                                                                             |
| ------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `fileChanged` | `EventEmitter<FilePayload>`                       | A local image or PDF is selected while `singleFile` is enabled. Webcam snapshots do not emit this event. |
| `uploadData`  | `EventEmitter<Array<FilePayload \| WebcamImage>>` | The user clicks Upload in the normal picker or webcam flow.                                              |
| `cleared`     | `EventEmitter<void>`                              | The component clears its current stored value or selection.                                              |

## Payload format

```typescript
type FilePayload = {
  data: string | ArrayBuffer | null;
  id: number;
  name: string;
  size: number;
};
```

For the current picker and webcam paths:

- `data` is a browser data URL containing the base64-encoded content.
- `id` is a component-generated numeric identifier. Do not assume it represents the item's position in the emitted selection.
- `name` is the original file name or a generated webcam/PDF name.
- `size` is the approximate size in kilobytes.

The declared `uploadData` type also accepts `WebcamImage` for compatibility. Current webcam captures are normalized to `FilePayload` before emission.

## File behavior and limits

- The image picker accepts PNG, JPEG, and GIF files. The PDF picker accepts PDF files.
- Locally selected files must be smaller than 3 MB. This check is applied to picker files, not webcam captures or generated merged PDFs.
- Outside form-entry mode, users may optionally merge multiple selected images into one PDF.
- In form-entry mode, images and webcam captures are automatically converted into one PDF before upload. PDF selection is restricted to one file.
- Webcam capture requires HTTPS or localhost because of browser permission requirements.
- The browser file filter and size check are client-side safeguards only. The receiving backend must validate file type, size, and content independently.

## Upload flow

When the component is used directly:

1. The user selects an image or PDF, or captures an image with the webcam.
2. Picker files are read as data URLs and placed in the component's local queue.
3. In the normal flow, the user clicks Upload. Form-entry mode first converts queued images into one PDF when applicable.
4. The component emits `uploadData`. In single-file picker mode, it emits `fileChanged` immediately after selection instead.
5. The host application sends each payload to its backend and assigns the resulting identifier or URL to `ngModel`.

When used through [openmrs-ngx-formentry](https://github.com/openmrs/openmrs-ngx-formentry):

1. The host registers a `DataSource` under the name referenced by the form's file question.
2. The form-entry wrapper passes each emitted payload to `DataSource.fileUpload()`.
3. The wrapper reads the string in `result.image` and stores it in the form control. That string may be a UUID, URL, or another host-defined file reference.
4. The wrapper uses `DataSource.fetchFile()` when it needs to retrieve stored content for display.

Neither this library nor `openmrs-ngx-formentry` defines the HTTP endpoint or storage implementation. Those responsibilities belong to the registered data source and its backend.

## Development

### Angular version upgrades

The selected Angular version must remain supported through the next RefApp release. Before proposing or reviewing an Angular major version bump, read the [Angular version support policy](https://o3-docs.openmrs.org/en-US/docs/frontend-modules/angular-version-policy). It explains when to migrate, how to select the target version, and which toolchain packages must be ready first.
