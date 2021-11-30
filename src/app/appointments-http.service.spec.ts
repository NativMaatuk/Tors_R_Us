import { TestBed } from '@angular/core/testing';

import { AppointmentsHttpService } from './appointments-http.service';

describe('AppointmentsHttpService', () => {
  let service: AppointmentsHttpService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppointmentsHttpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
