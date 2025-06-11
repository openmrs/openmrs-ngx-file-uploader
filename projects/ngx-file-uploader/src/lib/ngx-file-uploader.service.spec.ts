import { TestBed } from '@angular/core/testing';

import { NgxFileUploaderService } from './ngx-file-uploader.service';

describe('NgxFileUploaderService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: NgxFileUploaderService = TestBed.inject(NgxFileUploaderService);
    expect(service).toBeTruthy();
  });
});
