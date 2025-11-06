import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Posts, Post } from '../../core/posts';
import { Observable } from 'rxjs';
import { PostItem } from '../post-item/post-item';

@Component({
  selector: 'app-post-list',
  imports: [CommonModule, PostItem],
  templateUrl: './post-list.html',
  styleUrl: './post-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostList {
  private postsService = inject(Posts);
  posts$: Observable<Post[]> = this.postsService.posts$;
}