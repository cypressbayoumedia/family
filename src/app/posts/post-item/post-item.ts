import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Post } from '../../core/posts';
import { RouterModule } from '@angular/router';
@Component({
  selector: 'app-post-item',
  imports: [CommonModule, DatePipe, RouterModule],
  templateUrl: './post-item.html',
  styleUrl: './post-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostItem {
  post = input.required<Post>();
}