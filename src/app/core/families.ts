import { Injectable, inject, signal, effect, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Firestore, doc, docData, setDoc, collection, addDoc, updateDoc, arrayUnion, where, query, collectionData, getDoc, writeBatch } from '@angular/fire/firestore';
import { AuthService } from './auth';
import { Subscription, combineLatest, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { User } from '@angular/fire/auth';
import { getFunctions, httpsCallable } from '@angular/fire/functions';

// Define an interface for a family member for type safety
export interface FamilyMember {
  uid: string;
  name: string;
  email: string;
  birthday?: string; // Optional for now
  role?: 'admin' | 'member';
}
export interface Family {
  id: string;
  name: string;
  members: { uid: string; role: string; }[];
  subscription: { type: string, payingUser?: string, stripeSubscriptionId?: string, stripeCustomerId?: string };
}

@Injectable({
  providedIn: 'root'
})
export class Families implements OnDestroy {
  private readonly firestore: Firestore = inject(Firestore);
  private readonly authService: AuthService = inject(AuthService);
  private readonly router: Router = inject(Router);

  // --- RENAMED: `currentFamilyId` is now `activeFamilyId` for clarity ---
  public readonly activeFamilyId = signal<string | null>(null);
  public readonly activeFamily = signal<Family | null>(null);
  public readonly activeFamilyMembers = signal<FamilyMember[]>([]);
  
  // --- NEW: A signal to hold the list of ALL families the user is in ---
  public readonly allUserFamilies = signal<Family[]>([]);
  
  public readonly isLoading = signal<boolean>(true);

  private userSub: Subscription | null = null;
  private familySub: Subscription | null = null;
  private membersSub: Subscription | null = null;
  private allFamiliesSub: Subscription | null = null; // New subscription

  constructor() {
    // This effect is the reactive core of the service.
    // It automatically runs whenever the authentication state changes.
    effect(() => {
      this.cleanupSubscriptions();
      const user = this.authService.currentUser();

      if (user) {
        this.fetchUserProfileAndMemberships(user);
      } else {
        this.resetFamilyState();
      }
    });
  }

  /**
   * Creates a new family document in Firestore and links the current user to it.
   * @param familyName The desired name for the new family.
   */
  async createFamily(familyName: string, userName?: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) throw new Error("User must be logged in.");
    if (userName) await this.authService.updateUserDisplayName(userName);

    const batch = writeBatch(this.firestore);

    // 1. Create the new family document
    const familyRef = doc(collection(this.firestore, 'families'));
    batch.set(familyRef, {
      name: familyName,
      createdAt: new Date(),
      members: [{ uid: user.uid, role: 'admin' }],
      subscription: { type: 'free' }
    });

    // 2. Update the user's profile with the new membership and set it as active
    const userRef = doc(this.firestore, `users/${user.uid}`);
    batch.update(userRef, {
      activeFamilyId: familyRef.id,
      familyMemberships: arrayUnion({ familyId: familyRef.id, role: 'admin' })
    });

    await batch.commit();
    this.router.navigate(['']);
  }

  /**
   * UPDATED: Now accepts an optional user name.
   * If the name is provided, it updates the user's profile before joining the family.
   */
async joinFamily(familyId: string, userName?: string): Promise<void> {
  const user = this.authService.currentUser();
  if (!user) throw new Error("User must be logged in.");
  if (userName) await this.authService.updateUserDisplayName(userName);

  const functions = getFunctions();
  const joinFamilyCallable = httpsCallable(functions, 'joinFamily');

  try {
    const result = await joinFamilyCallable({ familyId });
    console.log('Successfully joined family:', result.data);
    this.router.navigate(['']);
  } catch (error: any) {
    // The error object from a callable function has a 'message' property
    // that contains the string you passed in the HttpsError on the backend.
    console.error('Error joining family:', error.message);
    alert('Error joining family')
    // Here you can show a notification to the user, for example:
    // this.uiService.showError(error.message);
    throw new Error(error.message);
  }
}


  /*
   * Fetches the user's own profile document to find their assigned familyId.
   */
  private fetchUserProfileAndMemberships(user: User): void {
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    this.userSub = docData(userDocRef).subscribe((userData: any) => {
      if (userData?.activeFamilyId) {
        if (this.activeFamilyId() !== userData.activeFamilyId) {
          this.activeFamilyId.set(userData.activeFamilyId);
          this.fetchFamilyDetails(userData.activeFamilyId);
          this.fetchFamilyMembers(userData.activeFamilyId);
        }
      }
      
      if (userData?.familyMemberships && userData.familyMemberships.length > 0) {
        this.fetchAllUserFamilies(userData.familyMemberships.map((m: any) => m.familyId));
      } else {
        this.resetFamilyState();
      }
    });
  }

  private fetchAllUserFamilies(familyIds: string[]): void {
    const familiesCollection = collection(this.firestore, 'families');
    const q = query(familiesCollection, where('__name__', 'in', familyIds));
    
    this.allFamiliesSub = collectionData(q, { idField: 'id' }).subscribe(families => {
      this.allUserFamilies.set(families as Family[]);
    });
  }

  private fetchFamilyDetails(familyId: string): void {
    const familyDocRef = doc(this.firestore, `families/${familyId}`);
    this.familySub = docData(familyDocRef, { idField: 'id' }).subscribe(familyData => {
      this.activeFamily.set(familyData as Family);
    });
  }
  /**
   * Fetches all user documents that belong to a given familyId.
   */
  private fetchFamilyMembers(familyId: string): void {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('familyId', '==', familyId));
    
    this.membersSub = collectionData(q, { idField: 'uid' }).subscribe(members => {
      this.activeFamilyMembers.set(members as FamilyMember[]);
      this.isLoading.set(false);
    });
  }

  /**
   * Resets all family-related state and signals.
   */
  private resetFamilyState(): void {
    this.activeFamilyId.set(null);
    this.activeFamily.set(null);
    this.activeFamilyMembers.set([]);
    this.allUserFamilies.set([]); // Reset the new signal
    this.isLoading.set(false);
  }

  private cleanupSubscriptions(): void {
    this.userSub?.unsubscribe();
    this.familySub?.unsubscribe();
    this.membersSub?.unsubscribe();
    this.allFamiliesSub?.unsubscribe(); // Clean up the new subscription
  }
  ngOnDestroy(): void {
    this.cleanupSubscriptions();
  }
}
