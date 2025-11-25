import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminInvite } from './admin-invite';

describe('AdminInvite', () => {
  let component: AdminInvite;
  let fixture: ComponentFixture<AdminInvite>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminInvite]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminInvite);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
