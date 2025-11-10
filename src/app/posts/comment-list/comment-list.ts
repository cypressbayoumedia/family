import { Component, effect, inject, input, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { Comments, Comment } from '../../core/comments';
import { AuthService } from '../../core/auth';
import { CommentItem } from '../comment-item/comment-item';
// import {CdkTextareaAutosize, TextFieldModule} from '@angular/cdk/text-field';
@Component({
  selector: 'app-comment-list',
  imports: [CommentItem, CommonModule, FormsModule,],
  templateUrl: './comment-list.html',
  styleUrl: './comment-list.css',
})
export class CommentList {
  familyId = input.required<string>();
  postId = input.required<string>();

  private commentsService = inject(Comments);
  authService = inject(AuthService);
  currentUser = this.authService.currentUser;
  comments$: Observable<Comment[]>;
  newCommentText = signal('');

  constructor() {
    this.comments$ = of([]); 

    effect(() => {
      // This code will run automatically whenever familyId() or postId() changes.
      const famId = this.familyId();
      const pId = this.postId();
      console.log('Effect running with:', famId, pId);

      // Only fetch if the IDs are valid
      if (famId && pId) {
        this.comments$ = this.commentsService.getCommentsForPost(famId, pId);
      }
    });
  }

  addComment(): void {
    this.commentsService.addComment(this.familyId(), this.postId(), this.newCommentText());
    this.newCommentText.set(''); // Clear the input after submitting
  }

  
}
