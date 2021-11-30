import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusinessAppointmentsComponent } from './business-appointments.component';

describe('BusinessAppointmentsComponent', () => {
  let component: BusinessAppointmentsComponent;
  let fixture: ComponentFixture<BusinessAppointmentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BusinessAppointmentsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BusinessAppointmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
