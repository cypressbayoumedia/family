import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoodleCreate } from './doodle-create';

describe('DoodleCreate', () => {
  let component: DoodleCreate;
  let fixture: ComponentFixture<DoodleCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoodleCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoodleCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
