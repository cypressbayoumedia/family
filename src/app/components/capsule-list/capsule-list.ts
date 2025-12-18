import { Component, ChangeDetectionStrategy, input, output, inject, signal, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Capsule } from '../../core/capsules';
import { Families } from '../../core/families';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-capsule-list',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './capsule-list.html',
  styleUrls: ['./capsule-list.css']
})
export class CapsuleList implements OnDestroy {
  capsules = input.required<Capsule[]>();
  layout = input<'strip' | 'grid'>('strip');

  create = output<void>();

  private familiesService = inject(Families);
  isAtCapsuleLimit = this.familiesService.isAtCapsuleLimit;

  // Countdown Logic
  now = signal(Date.now());
  private intervalId: any;

  constructor() {
    this.intervalId = setInterval(() => {
      this.now.set(Date.now());
    }, 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  getCountdown(capsule: Capsule): string | null {
    if (!capsule.eventDate) return null;

    const unlockTime = capsule.eventDate.toMillis();
    const now = this.now();
    const diff = unlockTime - now;

    if (diff <= 0) return null; // Already unlocked

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
  }
}