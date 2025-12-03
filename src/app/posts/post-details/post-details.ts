import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { Post, Posts } from '../../core/posts'; // Adjust path
import { Families } from '../../core/families'; // Adjust path
import { CommentList } from '../comment-list/comment-list';
import { AudioWaveform } from '../../components/audio-waveform/audio-waveform';
@Component({
  selector: 'app-post-details',
  imports: [CommonModule, RouterLink, CommentList, AudioWaveform],
  templateUrl: './post-details.html',
  styleUrl: './post-details.css',
})
export class PostDetails {
  private route = inject(ActivatedRoute);
  private postsService = inject(Posts);
  private familiesService = inject(Families);

  // A signal to control the visibility of the zoom modal
  isImageZoomed = signal(false);
  // A reactive stream that fetches the post data based on the URL
  post$: Observable<Post | undefined>;
  constructor() {
    const familyId$ = toObservable(this.familiesService.activeFamilyId);
    this.post$ = this.route.paramMap.pipe(
      switchMap(params => {
        const postId = params.get('postId');
        if (!postId) return of(undefined);

        return familyId$.pipe(
          switchMap(familyId => {
            if (!familyId) return of(undefined);
            return this.postsService.getPostById(familyId, postId);
          })
        );
      })
    );
  }
  // Methods to toggle the zoom state
  zoomIn(): void {
    this.isImageZoomed.set(true);
  }
  zoomOut(): void {
    this.isImageZoomed.set(false);
  }
  closeZoom(): void {
    this.isImageZoomed.set(false);
  }

  async downloadImage(url: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `family-hub-image-${Date.now()}.jpg`; // Default name
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to opening in new tab if fetch fails
      window.open(url, '_blank');
    }
  }
}
