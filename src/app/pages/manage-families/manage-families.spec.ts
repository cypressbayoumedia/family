import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageFamilies } from './manage-families';

describe('ManageFamilies', () => {
  let component: ManageFamilies;
  let fixture: ComponentFixture<ManageFamilies>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageFamilies]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageFamilies);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
