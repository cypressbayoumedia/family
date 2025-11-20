import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  collectionData, 
  doc, 
  updateDoc, 
  getDoc,
  docData,
  Timestamp 
} from '@angular/fire/firestore';
import { 
  Storage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from '@angular/fire/storage';
import { Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { v4 as uuidv4 } from 'uuid';

import { Families} from './families';
import { AuthService } from './auth';

export interface Capsule {
  id: string;
  title: string;
  eventDate: Timestamp;
  coverImageUrl?: string | null;
  latestActivityAt: Timestamp;
}

export interface CapsuleContent {
  id: string;
  type: 'photo' | 'audio';
  url: string;
  createdBy: string;
  authorName: string;
  authorPhotoURL?: string | null;
  createdAt: Timestamp;
}

@Injectable({
  providedIn: 'root'
})
export class CapsulesService {
  private afs = inject(Firestore);
  private storage = inject(Storage);
  private familiesService = inject(Families);
  private authService = inject(AuthService);

  // Convert the Signal to an Observable for Firestore piping
  private familyId$ = toObservable(this.familiesService.activeFamilyId);

  getActiveCapsules(): Observable<Capsule[]> {
    return this.familyId$.pipe(
      switchMap(familyId => {
        if (!familyId) return of([]);
        const capsulesRef = collection(this.afs, `families/${familyId}/capsules`);
        const q = query(capsulesRef, orderBy('latestActivityAt', 'desc'));
        return collectionData(q, { idField: 'id' }) as Observable<Capsule[]>;
      })
    );
  }

  getCapsule(capsuleId: string): Observable<Capsule | undefined> {
    return this.familyId$.pipe(
      switchMap(familyId => {
        if (!familyId) return of(undefined);
        const docRef = doc(this.afs, `families/${familyId}/capsules/${capsuleId}`);
        return docData(docRef, { idField: 'id' }) as Observable<Capsule>;
      })
    );
  }

  getCapsuleContent(capsuleId: string): Observable<CapsuleContent[]> {
    return this.familyId$.pipe(
      switchMap(familyId => {
        if (!familyId) return of([]);
        const contentRef = collection(this.afs, `families/${familyId}/capsules/${capsuleId}/content`);
        const q = query(contentRef, orderBy('createdAt', 'asc'));
        return collectionData(q, { idField: 'id' }) as Observable<CapsuleContent[]>;
      })
    );
  }

  async createCapsule(title: string, eventDate: Date): Promise<string> {
    const familyId = this.familiesService.activeFamilyId();
    const user = this.authService.currentUser(); // Assuming this is a Signal
    if (!familyId || !user) throw new Error("Not authorized.");

    const capsulesRef = collection(this.afs, `families/${familyId}/capsules`);
    const newCapsuleRef = await addDoc(capsulesRef, {
      title,
      eventDate: Timestamp.fromDate(eventDate),
      createdBy: user.uid,
      coverImageUrl: null,
      latestActivityAt: serverTimestamp(),
    });
    
    return newCapsuleRef.id;
  }

  async addContentToCapsule(capsuleId: string, file: File, type: 'photo' | 'audio'): Promise<void> {
    const familyId = this.familiesService.activeFamilyId();
    const user = this.authService.currentUser();
    if (!familyId || !user) throw new Error("Not authorized.");

    // 1. Upload
    const filePath = `families/${familyId}/capsules/${capsuleId}/${uuidv4()}`;
    const storageRef = ref(this.storage, filePath);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    // 2. Add Metadata
    const contentRef = collection(this.afs, `families/${familyId}/capsules/${capsuleId}/content`);
    await addDoc(contentRef, {
      type,
      url: downloadURL,
      createdBy: user.uid,
      authorName: user.displayName,
      authorPhotoURL: user.photoURL,
      createdAt: serverTimestamp(),
    });

    // 3. Update Parent Capsule
    const capsuleDoc = doc(this.afs, `families/${familyId}/capsules/${capsuleId}`);
    
    const updateData: any = {
      latestActivityAt: serverTimestamp(),
    };

    // Set cover image if it's the first photo
    if (type === 'photo') {
      const snapshot = await getDoc(capsuleDoc);
      const data = snapshot.data() as Capsule;
      if (!data?.coverImageUrl) {
        updateData.coverImageUrl = downloadURL;
      }
    }
    
    await updateDoc(capsuleDoc, updateData);
  }
}