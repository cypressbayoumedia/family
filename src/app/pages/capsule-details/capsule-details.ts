import { Component, inject, computed, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { RecordAudio } from '../../components/record-audio/record-audio';
import { AudioWaveform } from '../../components/audio-waveform/audio-waveform';
import { CapsuleGuide } from '../../components/capsule-guide/capsule-guide';
// Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { CapsulesService } from '../../core/capsules';
import { WakeLockService } from '../../core/wake-lock.service';

@Component({
  selector: 'app-capsule-details',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RecordAudio,
    AudioWaveform,
    CapsuleGuide
  ],
  templateUrl: './capsule-details.html',
  styleUrl: './capsule-details.css'
})
export class CapsuleDetails implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private capsulesService = inject(CapsulesService);
  private wakeLock = inject(WakeLockService);

  showGuide = signal(false);

  // 1. Fetch Capsule Data
  capsule = toSignal(
    this.route.params.pipe(
      switchMap(params => this.capsulesService.getCapsule(params['id']))
    )
  );

  // 2. Fetch Content Items
  content = toSignal(
    this.route.params.pipe(
      switchMap(params => this.capsulesService.getCapsuleContent(params['id']))
    ),
    { initialValue: [] }
  );

  // 3. Navigation State
  currentIndex = signal(0);

  // 4. Computed Active Item
  // 4. Computed Active Item
  activeItem = computed(() => {
    const items = this.content();
    return items && items.length > 0 ? items[this.currentIndex()] : null;
  });

  // 5. Lock & Timer Logic
  now = signal(Date.now()); // Updates every minute

  isLocked = computed(() => {
    const capsule = this.capsule();
    if (!capsule?.expiresAt) return false;
    return this.now() > capsule.expiresAt.toMillis();
  });

  isUpcoming = computed(() => {
    const capsule = this.capsule();
    if (!capsule?.eventDate) return false;
    return this.now() < capsule.eventDate.toMillis();
  });

  timeRemaining = computed(() => {
    const capsule = this.capsule();
    if (!capsule?.expiresAt || !capsule?.eventDate) return '';

    const now = this.now();

    // Check if upcoming
    if (now < capsule.eventDate.toMillis()) {
      const diff = capsule.eventDate.toMillis() - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (days > 0) return `Opens in ${days}d ${hours}h`;
      return `Opens in ${hours}h`;
    }

    const diff = capsule.expiresAt.toMillis() - now;
    if (diff <= 0) return 'Sealed';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m left`;
  });

  constructor() {
    // Update 'now' every minute to refresh the timer/lock status
    setInterval(() => {
      this.now.set(Date.now());
    }, 60000);

    // Request Wake Lock
    this.wakeLock.requestLock();
  }

  ngOnDestroy(): void {
    this.wakeLock.releaseLock();
  }

  showRecordAudio = signal(false);

  next() {
    const items = this.content();
    if (!items) return;

    if (this.currentIndex() < items.length - 1) {
      this.currentIndex.update(i => i + 1);
    } else {
      this.close();
    }
  }

  prev() {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
    }
  }

  close() {
    this.router.navigate(['/']);
  }

  // 5. Upload Logic
  async onFileSelected(event: Event) {
    const capsule = this.capsule();
    if (!capsule) return;

    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    // Simple type detection for MVP
    const type = file.type.startsWith('image') ? 'photo' : 'audio';

    await this.capsulesService.addContentToCapsule(capsule.id, file, type);

    // Reset input
    input.value = '';

    // Move index to the newly added item (optional, depends on Firestore latency)
    const items = this.content();
    if (items) this.currentIndex.set(items.length);
  }

  /**
  * NEW METHOD: Toggles the visibility of the audio recorder.
  */
  toggleRecordAudio(): void {
    this.showRecordAudio.update(value => !value);
  }

  /**
   * NEW METHOD: Handles the saved audio file from the RecordAudio component.
   */
  async onAudioSaved(file: File): Promise<void> {
    const capsule = this.capsule();
    if (!capsule) return;

    // We can reuse the same service method
    await this.capsulesService.addContentToCapsule(capsule.id, file, 'audio');

    // Close the recorder and advance to the new item
    this.showRecordAudio.set(false);
    const items = this.content();
    if (items) this.currentIndex.set(items.length);
  }

  /**
   * NEW METHOD: Handles the close event from the RecordAudio component.
   */
  onAudioRecorderClosed(): void {
    this.showRecordAudio.set(false);
  }

  /**
   * NEW METHOD: Downloads the media (image or audio) to the user's device.
   */
  async downloadMedia(url: string, type: 'photo' | 'audio', event: Event) {
    event.preventDefault();
    event.stopPropagation();

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = objectUrl;
      const extension = type === 'photo' ? 'jpg' : 'mp3'; // Simple extension mapping
      a.download = `capsule-memory-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank');
    }
  }
}