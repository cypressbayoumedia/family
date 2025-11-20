import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { RecordAudio } from '../../components/record-audio/record-audio';
import { AudioWaveform } from '../../components/audio-waveform/audio-waveform';
// Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { CapsulesService } from '../../core/capsules';

@Component({
  selector: 'app-capsule-details',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatIconModule, 
    MatMenuModule,
    RecordAudio,
    AudioWaveform,
  ],
  templateUrl: './capsule-details.html',
  styleUrl: './capsule-details.css'
})
export class CapsuleDetails {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private capsulesService = inject(CapsulesService);

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
  activeItem = computed(() => {
    const items = this.content();
    return items && items.length > 0 ? items[this.currentIndex()] : null;
  });

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
}