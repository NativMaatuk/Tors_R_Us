import { TestBed } from '@angular/core/testing';

import { BusinessesHttpService } from './businesses-http.service';

describe('BusinessesHttpService', () => {
  let service: BusinessesHttpService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BusinessesHttpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
