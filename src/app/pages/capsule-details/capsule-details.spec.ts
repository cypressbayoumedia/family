import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CapsuleDetails } from './capsule-details';

describe('CapsuleDetails', () => {
  let component: CapsuleDetails;
  let fixture: ComponentFixture<CapsuleDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CapsuleDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CapsuleDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
