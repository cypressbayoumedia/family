import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Comment } from '../../core/comments';
import { DatePipe } from '@angular/common';
@Component({
  selector: 'app-comment-item',
  imports: [CommonModule],
  templateUrl: './comment-item.html',
  styleUrl: './comment-item.css',
})
export class CommentItem {
  @Input({ required: true }) comment!: Comment;
}
