import { ChangeDetectionStrategy, Component, inject, input, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Post } from '../../core/posts';
import { RouterModule, Router } from '@angular/router';
import { AudioWaveform } from '../../components/audio-waveform/audio-waveform';
import { AuthService } from '../../core/auth';
import { Posts } from '../../core/posts';
@Component({
  selector: 'app-post-item',
  imports: [CommonModule, DatePipe, RouterModule, AudioWaveform],
  templateUrl: './post-item.html',
  styleUrl: './post-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostItem {
  private router = inject(Router);
  private postsService = inject(Posts);
  private authService = inject(AuthService);

  post = input.required<Post>();
  menuOpen = signal(false);

  canDelete = computed(() => {
    const user = this.authService.currentUser();
    const post = this.post();
    return user?.uid === post.authorId;
  });

  navigateToPost(postId: string | undefined): void {
    if (postId) {
      this.router.navigate(['/post', postId]);
    }
  }

  toggleMenu(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.menuOpen.update(v => !v);
  }

  async deletePost() {
    if (!confirm('Are you sure you want to delete this post?')) return;

    const post = this.post();
    try {
      await this.postsService.deletePost(post.familyId, post.id!);
      // Optimistic UI or wait for list to update automatically via Firestore subscription
      // State reset
      this.menuOpen.set(false);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post.');
    }
  }
}
