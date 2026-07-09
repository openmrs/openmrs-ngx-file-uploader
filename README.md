# OpenMRS file uploader

Angular file uploader component for OpenMRS O3 forms. Supports image and PDF uploads, optional image-to-PDF merge, and webcam capture. Designed for use with the [O3 Angular form engine](https://github.com/openmrs/openmrs-ngx-formentry) and [file fields](https://ampath-forms.vercel.app/docs/field-types-reference#file).

## Installation

```bash
yarn add @openmrs/ngx-file-uploader
```

## Peer dependencies

This library expects Carbon Angular and related packages to be provided by the host app:

```bash
yarn add carbon-components-angular @carbon/styles @carbon/icons @ibm/plex
```

## Angular version policy

This library is part of the O3 Angular form engine stack, together with [openmrs-ngx-formentry](https://github.com/openmrs/openmrs-ngx-formentry) and [esm-form-entry-app](https://github.com/openmrs/openmrs-esm-patient-chart/tree/main/packages/esm-form-entry-app). All three must use the same Angular major version, and that version must still be supported by Angular through the next RefApp release. By convention, this library's major version matches the Angular major it supports: 20.x supports Angular 20, so moving to a new Angular major means a new major release of this library. Before proposing or reviewing an Angular major version bump, read the [Angular version support policy](https://o3-docs.openmrs.org/en-US/docs/frontend-modules/angular-version-policy). It explains when to migrate, how to pick the target version, and which toolchain packages must be ready first.

## Styles

Ensure Carbon styles are included and fonts are available. Add the following to your global styles (e.g. `src/styles.scss`):

```scss
@use '@carbon/styles/scss/config' with (
  $use-flexbox-grid: true,
  $css--font-face: true,
  $font-path: '/assets/fonts/plex'
);

@use '@carbon/styles';
```

Copy IBM Plex fonts to `/assets/fonts/plex` in your build (Angular `assets` config).

## Usage

```typescript
import { NgxFileUploaderComponent } from '@openmrs/ngx-file-uploader';

@Component({
  imports: [NgxFileUploaderComponent],
  template: `
    <lib-ngx-file-uploader
      [(ngModel)]="fileValue"
      (fileChanged)="onFileChanged($event)"
      (uploadData)="onUpload($event)"
      (cleared)="onClear()"
    />
  `
})
```

## Inputs

- `singleFile: boolean` — restrict selection to a single file.
- `formEntry: boolean` — enables PDF merge behavior for image uploads.
- `pdfFileName: string` — file name used when merging images to PDF.
- `srcUrl: string` — optional URL for a previously uploaded file.

## Outputs

- `fileChanged: EventEmitter<FilePayload>` — emits on single file selection.
- `uploadData: EventEmitter<(FilePayload | WebcamImage)[]>` — emits on upload.
- `cleared: EventEmitter<void>` — emits when cleared.

## How it works

This library handles file selection and preparation, but does not upload files directly. The upload flow is:

1. User selects files → this library emits `uploadData` with base64-encoded payloads
2. [openmrs-ngx-formentry](https://github.com/openmrs/openmrs-ngx-formentry) wraps this component and calls `DataSource.fileUpload()`
3. The consuming app implements `fileUpload()` to POST data to the backend
4. The backend returns a file UUID, which is stored in the form control

This design keeps the library transport-agnostic — it prepares file data, while the consuming app handles HTTP and storage.

## Webcam

Webcam capture requires HTTPS (or localhost) due to browser permissions.
