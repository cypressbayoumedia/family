import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InviteMembers } from './invite-members';

describe('InviteMembers', () => {
  let component: InviteMembers;
  let fixture: ComponentFixture<InviteMembers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteMembers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InviteMembers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
