import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CapsuleList } from './capsule-list';

describe('CapsuleList', () => {
  let component: CapsuleList;
  let fixture: ComponentFixture<CapsuleList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CapsuleList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CapsuleList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
