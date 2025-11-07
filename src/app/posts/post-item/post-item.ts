import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Post } from '../../core/posts';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-post-item',
  imports: [CommonModule, DatePipe, RouterModule],
  templateUrl: './post-item.html',
  styleUrl: './post-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostItem {
  private router = inject(Router);
  post = input.required<Post>();

  navigateToPost(postId: string|undefined): void {
    if (postId) {
      this.router.navigate(['/post', postId]);
    }
  }
}
