import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Post } from '../../core/posts';

@Component({
  selector: 'app-post-item',
  imports: [CommonModule, DatePipe],
  templateUrl: './post-item.html',
  styleUrl: './post-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostItem {
  post = input.required<Post>();
}