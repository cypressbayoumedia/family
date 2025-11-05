import { inject, Injectable, computed } from '@angular/core';
import { Firestore, collection, addDoc, serverTimestamp, query, orderBy, collectionData, doc, docData } from '@angular/fire/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { v4 as uuidv4 } from 'uuid';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

// --- Service Dependencies ---
import { AuthService } from './auth'; // Adjust path as needed
import { Families } from './families'; // Adjust path as needed

// --- UPDATED Post Interface ---
// It's crucial to know WHO made the post.
export interface Post {
  id?: string;
  familyId: string;
  authorId: string; // The UID of the user who created it
  authorName: string; // Denormalized for easy display
  content: string;
  imageUrl?: string;
  audioUrl?: string;
  createdAt: any; // Stays as `any` for serverTimestamp compatibility
}

@Injectable({
  providedIn: 'root',
})
export class Posts {
  private readonly afs = inject(Firestore);
  private readonly storage = getStorage();
  private readonly authService = inject(AuthService);
  private readonly familiesService = inject(Families);


  public readonly posts$: Observable<Post[]>;

  constructor() {
    
    const familyId$ = toObservable(this.familiesService.activeFamilyId);


    this.posts$ = familyId$.pipe(
      switchMap(familyId => {
        if (!familyId) {
          // If there's no familyId, return an observable of an empty array.
          return of([]);
        }
        // If there IS a familyId, fetch the posts for that specific family.
        const postsCollection = collection(this.afs, `families/${familyId}/posts`);
        const postsQuery = query(postsCollection, orderBy('createdAt', 'desc'));
        return collectionData(postsQuery, { idField: 'id' }) as Observable<Post[]>;
      })
    );
  }

  getPostById(familyId: string, postId: string): Observable<Post | undefined> {
    if (!familyId || !postId) {
      return of(undefined); // Return nothing if IDs are missing
    }
    const postDocRef = doc(this.afs, `families/${familyId}/posts/${postId}`);
    return docData(postDocRef, { idField: 'id' }) as Observable<Post>;
  }
  
  async addPost(postContent: { content: string }, imageFile?: File | null, audioFile?: File | null): Promise<void> {
    const user = this.authService.currentUser();
    const familyId = this.familiesService.activeFamilyId();

    // --- Guard Clauses: Fail early if essential data is missing. ---
    if (!user) throw new Error('User must be logged in to create a post.');
    if (!familyId) throw new Error('User must belong to a family to create a post.');

    // --- Private helper to upload a file and get the URL ---
    const uploadFile = async (file: File, path: string): Promise<string> => {
      const fileExt = file.name.split('.').pop();
      const storageRef = ref(this.storage, `${path}/${uuidv4()}.${fileExt}`);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    };

    // --- Prepare the Post Data ---
    const postData: Omit<Post, 'id'> = {
      ...postContent,
      familyId: familyId,
      authorId: user.uid,
      authorName: user.displayName || 'Unknown User', // Get name from auth state
      createdAt: serverTimestamp(),
    };

    if (imageFile) {
      postData.imageUrl = await uploadFile(imageFile, `families/${familyId}/images`);
    }

    if (audioFile) {
      postData.audioUrl = await uploadFile(audioFile, `families/${familyId}/audio`);
    }

    // Reference the correct subcollection for posts
    const postsCollection = collection(this.afs, `families/${familyId}/posts`);
    await addDoc(postsCollection, postData);
  }
}