import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoinHub } from './join-hub';

describe('JoinHub', () => {
  let component: JoinHub;
  let fixture: ComponentFixture<JoinHub>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinHub]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JoinHub);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
