import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServicesChartComponent } from './services-chart.component';

describe('ServicesChartComponent', () => {
  let component: ServicesChartComponent;
  let fixture: ComponentFixture<ServicesChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ServicesChartComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ServicesChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
