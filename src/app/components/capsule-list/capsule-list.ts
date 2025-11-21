// src/app/capsules/capsule-home-display.component.ts
import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Capsule} from '../../core/capsules';
import { Families } from '../../core/families';

@Component({
  selector: 'app-capsule-list',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl:'./capsule-list.html',
  styleUrls:['./capsule-list.css']
})
export class CapsuleList {
  capsules = input.required<Capsule[]>();
  create = output<void>();

  private familiesService = inject(Families);
  isAtCapsuleLimit = this.familiesService.isAtCapsuleLimit;
}