import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnedBusinessesComponent } from './owned-businesses.component';

describe('OwnedBusinessesComponent', () => {
  let component: OwnedBusinessesComponent;
  let fixture: ComponentFixture<OwnedBusinessesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OwnedBusinessesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OwnedBusinessesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
