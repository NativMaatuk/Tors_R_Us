import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoAndReviewsComponent } from './info-and-reviews.component';

describe('InfoAndReviewsComponent', () => {
  let component: InfoAndReviewsComponent;
  let fixture: ComponentFixture<InfoAndReviewsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InfoAndReviewsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InfoAndReviewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
