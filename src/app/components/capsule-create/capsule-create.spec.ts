import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CapsuleCreate } from './capsule-create';

describe('CapsuleCreate', () => {
  let component: CapsuleCreate;
  let fixture: ComponentFixture<CapsuleCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CapsuleCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CapsuleCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
