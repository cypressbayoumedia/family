import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import {
  Firestore, doc, docData, setDoc, collection, addDoc, updateDoc, arrayUnion, where, query, collectionData, writeBatch, FirestoreDataConverter, DocumentData, QueryDocumentSnapshot, SnapshotOptions
} from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from './auth';
import { of } from 'rxjs';
import { switchMap, map, filter } from 'rxjs/operators';
import { User } from '@angular/fire/auth';
import { getFunctions, httpsCallable } from '@angular/fire/functions';

// Define an interface for a family member for type safety
export interface FamilyMember {
  uid: string;
  name: string;
  email: string;
  birthday?: string; // Optional for now
  role?: 'admin' | 'member';
  color?: string;
}

export interface Family {
  id: string;
  name: string;
  members: { uid: string; role: string; }[];
  subscription: { type: string, payingUser?: string, stripeSubscriptionId?: string, stripeCustomerId?: string };
  capsuleCount?: number;
}

// Firestore data converter for the Family interface
const familyConverter: FirestoreDataConverter<Family> = {
  toFirestore: (family: Family): DocumentData => {
    // Omit the 'id' field when writing to Firestore
    const { id, ...data } = family;
    return data;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Family => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      name: data['name'],
      members: data['members'],
      subscription: data['subscription'],
      capsuleCount: data['capsuleCount']
    } as Family;
  }
};

// Firestore data converter for the FamilyMember interface
const familyMemberConverter: FirestoreDataConverter<FamilyMember> = {
  toFirestore: (member: FamilyMember): DocumentData => {
    return { ...member };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): FamilyMember => {
    const data = snapshot.data(options)!;
    return {
      uid: snapshot.id,
      name: data['name'],
      email: data['email'],
      birthday: data['birthday'],
      role: data['role'],
      color: data['color']
    } as FamilyMember;
  }
};

@Injectable({
  providedIn: 'root'
})
export class Families {
  private readonly firestore: Firestore = inject(Firestore);
  private readonly authService: AuthService = inject(AuthService);
  private readonly router: Router = inject(Router);

  // --- Core Observables ---
  private user$ = this.authService.user$;

  private activeFamilyId$ = this.user$.pipe(
    switchMap(user => {
      if (!user) return of(null);
      return docData(doc(this.firestore, `users/${user.uid}`)).pipe(
        filter((userData): userData is DocumentData => userData !== undefined),
        map(userData => userData['activeFamilyId'] as string | null)
      );
    })
  );

  private activeFamily$ = this.activeFamilyId$.pipe(
    switchMap(familyId => {
      if (!familyId) return of(null);
      const familyDoc = doc(this.firestore, `families/${familyId}`).withConverter(familyConverter);
      return docData(familyDoc);
    })
  );

  private activeFamilyMembers$ = this.activeFamilyId$.pipe(
    switchMap(familyId => {
      if (!familyId) return of([]);
      const membersQuery = query(collection(this.firestore, 'users'), where('familyId', '==', familyId)).withConverter(familyMemberConverter);
      return collectionData(membersQuery);
    })
  );

  private allUserFamilies$ = this.user$.pipe(
    switchMap(user => {
      if (!user) return of([]);
      return docData(doc(this.firestore, `users/${user.uid}`)).pipe(
        filter((userData): userData is DocumentData => userData !== undefined),
        switchMap(userData => {
          const familyIds = userData['familyMemberships']?.map((m: any) => m.familyId) || [];
          if (familyIds.length === 0) return of([]);
          const familiesQuery = query(collection(this.firestore, 'families'), where('__name__', 'in', familyIds)).withConverter(familyConverter);
          return collectionData(familiesQuery);
        })
      );
    })
  );

  // --- Signals ---
  public readonly activeFamilyId = toSignal(this.activeFamilyId$, { initialValue: null });
  public readonly activeFamily = toSignal(this.activeFamily$, { initialValue: null });
  public readonly activeFamilyMembers = toSignal(this.activeFamilyMembers$, { initialValue: [] });
  public readonly allUserFamilies = toSignal(this.allUserFamilies$, { initialValue: [] });

  public readonly isLoading = signal<boolean>(false);

  public readonly isAtCapsuleLimit = computed(() => {
    const family = this.activeFamily();
    if (!family) return false;

    const isFree = !family.subscription || family.subscription.type === 'free';
    const count = family.capsuleCount || 0;

    return isFree && count >= 1;
  });

  constructor() {
    // No more manual subscriptions needed!
  }

  async createFamily(familyName: string, userName?: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) throw new Error("User must be logged in.");
    if (userName) await this.authService.updateUserDisplayName(userName);

    this.isLoading.set(true);
    const batch = writeBatch(this.firestore);

    // 1. Create the new family document
    const familyRef = doc(collection(this.firestore, 'families')).withConverter(familyConverter);
    batch.set(familyRef, {
      id: '',
      name: familyName,
      members: [{ uid: user.uid, role: 'admin' }],
      subscription: { type: 'free' },
      capsuleCount: 0,
    } as Family);

    // 2. Update the user's profile with the new membership and set it as active
    const userRef = doc(this.firestore, `users/${user.uid}`);
    batch.update(userRef, {
      activeFamilyId: familyRef.id,
      familyMemberships: arrayUnion({ familyId: familyRef.id, role: 'admin' })
    });

    await batch.commit();
    this.isLoading.set(false);
    this.router.navigate(['']);
  }


  async joinFamily(familyId: string, userName?: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) throw new Error("User must be logged in.");
    if (userName) await this.authService.updateUserDisplayName(userName);

    this.isLoading.set(true);
    const functions = getFunctions();
    const joinFamilyCallable = httpsCallable(functions, 'joinFamily');

    try {
      const result = await joinFamilyCallable({ familyId });
      console.log('Successfully joined family:', result.data);
      this.router.navigate(['']);
    } catch (error: any) {
      console.error('Error joining family:', error.message);
      alert('Error joining family')
      throw new Error(error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateFamilyName(newName: string): Promise<void> {
    const familyId = this.activeFamilyId();
    if (!familyId) throw new Error("Family must be selected.");
    const familyRef = doc(this.firestore, `families/${familyId}`);
    await updateDoc(familyRef, { name: newName });
  }

}
