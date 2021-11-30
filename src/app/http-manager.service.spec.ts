import { TestBed } from '@angular/core/testing';

import { HttpManagerService } from './http-manager.service';

describe('HttpManagerService', () => {
  let service: HttpManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HttpManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
