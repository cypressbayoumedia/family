import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordAudio } from './record-audio';

describe('RecordAudio', () => {
  let component: RecordAudio;
  let fixture: ComponentFixture<RecordAudio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordAudio]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecordAudio);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
