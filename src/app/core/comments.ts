import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, serverTimestamp, query, orderBy, collectionData } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { AuthService } from './auth';

// Define the Comment interface
export interface Comment {
  id?: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string | null;
  text: string;
  createdAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class Comments {
  private afs = inject(Firestore);
  private authService = inject(AuthService);


  getCommentsForPost(familyId: string, postId: string): Observable<Comment[]> {
    if (!familyId || !postId) return of([]);
    
    const commentsCollection = collection(this.afs, `families/${familyId}/posts/${postId}/comments`);
    const q = query(commentsCollection, orderBy('createdAt', 'asc')); // Oldest comments first
    return collectionData(q, { idField: 'id' }) as Observable<Comment[]>;
  }

  async addComment(familyId: string, postId: string, text: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user || !text.trim()) return;

    const commentsCollection = collection(this.afs, `families/${familyId}/posts/${postId}/comments`);
    
    const newComment: Omit<Comment, 'id'> = {
      text: text,
      authorId: user.uid,
      authorName: user.displayName || 'Unknown User',
      authorPhotoURL: user.photoURL || null,
      createdAt: serverTimestamp()
    };
    
    await addDoc(commentsCollection, newComment);
  }
}