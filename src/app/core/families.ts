import { Injectable, inject, signal, effect, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {
  Firestore,
  doc,
  docData,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  arrayUnion,
  where,
  query,
  collectionData,
  getDoc
} from '@angular/fire/firestore';
import { AuthService } from './auth'; // Adjust path as needed
import { Subscription } from 'rxjs';
import { User } from '@angular/fire/auth';

// Define an interface for a family member for type safety
export interface FamilyMember {
  uid: string;
  name: string;
  email: string;
  birthday?: string; // Optional for now
  role?: 'admin' | 'member';
}

@Injectable({
  providedIn: 'root'
})
export class Families implements OnDestroy {
  private readonly firestore: Firestore = inject(Firestore);
  private readonly authService: AuthService = inject(AuthService);
  private readonly router: Router = inject(Router);

  // --- Public Signals for Application State ---
  public readonly currentFamilyId = signal<string | null>(null);
  public readonly currentFamilyMembers = signal<FamilyMember[]>([]);
  public readonly isLoading = signal<boolean>(true);

  // --- Private Subscriptions for Cleanup ---
  private userSub: Subscription | null = null;
  private membersSub: Subscription | null = null;

  constructor() {
    // This effect is the reactive core of the service.
    // It automatically runs whenever the authentication state changes.
    effect(() => {
      this.cleanupSubscriptions(); // Clean up old subscriptions first
      const user = this.authService.currentUser();

      if (user) {
        // User is logged in, fetch their profile to find their familyId
        this.fetchUserProfile(user);
      } else {
        // User is logged out, clear all family data
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
    if (!user) throw new Error("User must be logged in to create a family.");

    // If a user name was provided, update the profile first.
    if (userName) {
      await this.authService.updateUserDisplayName(userName);
    }
    
    const familyCollection = collection(this.firestore, 'families');
    const newFamilyRef = await addDoc(familyCollection, {
      name: familyName,
      createdAt: new Date(),
      members: [{ uid: user.uid, role: 'admin' }]
    });

    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    await updateDoc(userDocRef, { familyId: newFamilyRef.id });

    this.router.navigate(['']);
  }

  /**
   * UPDATED: Now accepts an optional user name.
   * If the name is provided, it updates the user's profile before joining the family.
   */
  async joinFamily(familyId: string, userName?: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) throw new Error("User must be logged in to join a family.");

    // If a user name was provided, update the profile first.
    if (userName) {
      await this.authService.updateUserDisplayName(userName);
    }

    const familyDocRef = doc(this.firestore, `families/${familyId}`);
    const familySnap = await getDoc(familyDocRef);
    if (!familySnap.exists()) {
      throw new Error("No family found with that ID. Please check the code.");
    }

    await updateDoc(familyDocRef, {
      members: arrayUnion({ uid: user.uid, role: 'member' })
    });

    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    await updateDoc(userDocRef, { familyId: familyId }); // Corrected a small bug here

    this.router.navigate(['']);
  }
  /**
   * Fetches the user's own profile document to find their assigned familyId.
   */
  private fetchUserProfile(user: User): void {
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    this.userSub = docData(userDocRef).subscribe((userData: any) => {
      if (userData && userData.familyId) {
        this.currentFamilyId.set(userData.familyId);
        // Now that we have the familyId, fetch all members of that family
        this.fetchFamilyMembers(userData.familyId);
      } else {
        // This user exists but isn't part of a family yet
        this.resetFamilyState();
      }
    });
  }

  /**
   * Fetches all user documents that belong to a given familyId.
   */
  private fetchFamilyMembers(familyId: string): void {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('familyId', '==', familyId));
    
    this.membersSub = collectionData(q, { idField: 'uid' }).subscribe(members => {
      this.currentFamilyMembers.set(members as FamilyMember[]);
      this.isLoading.set(false);
    });
  }

  /**
   * Resets all family-related state and signals.
   */
  private resetFamilyState(): void {
    this.currentFamilyId.set(null);
    this.currentFamilyMembers.set([]);
    this.isLoading.set(false);
  }

  /**
   * Unsubscribes from all active Firestore listeners to prevent memory leaks.
   */
  private cleanupSubscriptions(): void {
    this.userSub?.unsubscribe();
    this.membersSub?.unsubscribe();
  }

  ngOnDestroy(): void {
    this.cleanupSubscriptions();
  }
}