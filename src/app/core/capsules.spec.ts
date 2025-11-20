import { TestBed } from '@angular/core/testing';

import { Capsules } from './capsules';

describe('Capsules', () => {
  let service: Capsules;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Capsules);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
