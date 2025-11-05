import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FamilySwitcher } from './family-switcher';

describe('FamilySwitcher', () => {
  let component: FamilySwitcher;
  let fixture: ComponentFixture<FamilySwitcher>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FamilySwitcher]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FamilySwitcher);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
