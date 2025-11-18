import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AudioWaveform } from '../../components/audio-waveform/audio-waveform';
// Import the NEW, family-aware PostsService
import { Posts } from '../../core/posts'; // Adjust path if needed
import { RecordAudio } from '../../components/record-audio/record-audio';
import { AuthService } from '../../core/auth';
import { DoodleCreate } from '../../components/doodle-create/doodle-create';

@Component({
  selector: 'app-post-create',
  imports: [FormsModule, CommonModule, RecordAudio, RouterModule, AudioWaveform,DoodleCreate],
  templateUrl: './post-create.html',
  styleUrl: './post-create.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostCreate implements OnDestroy {
  // Inject the new PostsService
  private postsService = inject(Posts);
  private authService = inject(AuthService); // <-- Inject AuthService
  private router = inject(Router);
  
  // --- All your existing signals for content and media are perfect ---
  content = signal('');
  imageFile = signal<File | null>(null);
  audioFile = signal<File | null>(null);
  showRecordAudio = signal(false);
  imagePreviewUrl = signal<string | null>(null);
  audioPreviewUrl = signal<string | null>(null);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  showDoodleCanvas = signal(false);
  // Expose the currentUser signal directly for the template
  currentUser = this.authService.currentUser;
  /**
   * The new, robust addPost method that relies on the service to handle author info.
   */
  async addPost(): Promise<void> {
    if (!this.content().trim() && !this.imageFile() && !this.audioFile()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.postsService.addPost(
        { content: this.content() },
        this.imageFile(),
        this.audioFile()
      );
      this.resetForm();
      // Navigate back to the main feed on success
      this.router.navigate(['/']); 
    } catch (error: any) {
      console.error("Failed to create post:", error);
      this.errorMessage.set('Failed to create post. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // ===================================================================
  // All of your other methods for handling media and state are correct
  // and do not need to be changed.
  // ===================================================================

  ngOnDestroy(): void {
    this.revokeImagePreview();
    this.revokeAudioPreview();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      this.imageFile.set(file);
      this.revokeImagePreview();
      this.imagePreviewUrl.set(URL.createObjectURL(file));
    }
  }

  onAudioSaved(file: File): void {
    this.audioFile.set(file);
    this.showRecordAudio.set(false);
    this.revokeAudioPreview();
    this.audioPreviewUrl.set(URL.createObjectURL(file));
  }

  onAudioRecorderClosed(): void {
    this.showRecordAudio.set(false);
  }

  toggleRecordAudio(): void {
    this.showRecordAudio.update(value => !value);
  }

  removeImage(): void {
    this.imageFile.set(null);
    this.revokeImagePreview();
  }

  removeAudio(): void {
    this.audioFile.set(null);
    this.revokeAudioPreview();
  }

  private resetForm(): void {
    this.content.set('');
    this.imageFile.set(null);
    this.audioFile.set(null);
    this.revokeImagePreview();
    this.revokeAudioPreview();
  }

  private revokeImagePreview(): void {
    if (this.imagePreviewUrl()) {
      URL.revokeObjectURL(this.imagePreviewUrl()!);
      this.imagePreviewUrl.set(null);
    }
  }

  private revokeAudioPreview(): void {
    if (this.audioPreviewUrl()) {
      URL.revokeObjectURL(this.audioPreviewUrl()!);
      this.audioPreviewUrl.set(null);
    }
  }

  toggleDoodleCanvas(): void {
    this.showDoodleCanvas.update(value => !value);
  }

  /**
   * Handles the saved doodle file from the child component.
   */
  onDoodleSaved(file: File): void {
    // When the doodle is saved, we treat it just like a regular image upload.
    this.imageFile.set(file);
    this.imagePreviewUrl.set(URL.createObjectURL(file));
    this.showDoodleCanvas.set(false); // Close the doodle component
  }

  /**
   * Handles the close event from the doodle component.
   */
  onDoodleClosed(): void {
    this.showDoodleCanvas.set(false);
  }
}