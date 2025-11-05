import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { Post, Posts } from '../../core/posts'; // Adjust path
import { Families } from '../../core/families'; // Adjust path

@Component({
  selector: 'app-post-details',
  imports: [CommonModule, RouterLink],  
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
}
