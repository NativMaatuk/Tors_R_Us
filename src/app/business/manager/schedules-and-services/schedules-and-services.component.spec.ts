import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchedulesAndServicesComponent } from './schedules-and-services.component';

describe('SchedulesAndServicesComponent', () => {
  let component: SchedulesAndServicesComponent;
  let fixture: ComponentFixture<SchedulesAndServicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SchedulesAndServicesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SchedulesAndServicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
