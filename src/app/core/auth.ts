import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User
} from '@angular/fire/auth';
import {
  doc,
  Firestore,
  setDoc,
  updateDoc
} from '@angular/fire/firestore';
import { Observable, Subscription } from 'rxjs';
import { Families } from './families';
@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private readonly auth: Auth = inject(Auth);
  private readonly firestore: Firestore = inject(Firestore);
  private readonly router: Router = inject(Router);

  public readonly currentUser = signal<User | null>(null);
  public readonly loading = signal<boolean>(true);

  private readonly authState$: Observable<User | null> = authState(this.auth);
  private authStateSubscription: Subscription;
  // private familiesService = inject(Families);

  constructor() {
    this.authStateSubscription = this.authState$.subscribe((user) => {
      this.currentUser.set(user);
      this.loading.set(false);
    });
  }

  /**
   * Signs up a new user and navigates them to the welcome/onboarding component.
   */
  async signUpWithEmail(name: string, email: string, password: string, inviteId?: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      await this.createUserProfile(userCredential.user, { name });
      
      // ADDED: Navigate new users to the welcome page to create/join a family.
      await this.updateUserDisplayName(name);
     if(inviteId){
        // await this.familiesService.joinFamily(inviteId)
        await this.switchActiveFamily(inviteId)
      }
      
      this.router.navigate(['/welcome']); 
      
      return userCredential;
    } catch (error) {
      console.error("Error during email sign up:", error);
      throw error;
    }
  }


  async switchActiveFamily(familyId: string): Promise<void> {
    const user = this.currentUser();
    if (!user) throw new Error("User must be logged in to switch families.");

    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    await updateDoc(userDocRef, { activeFamilyId: familyId });
  }

  /**
   * Signs in an existing user and navigates them to the main dashboard.
   */
  async signInWithEmail(email: string, password: string, inviteId?: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      
      if(inviteId){
        // await this.familiesService.joinFamily(inviteId)
        await this.switchActiveFamily(inviteId)
      }
      this.router.navigate(['']);
      
      return userCredential;
    } catch (error) {
      console.error("Error during email sign in:", error);
      throw error;
    }
  }

  /**
   * Signs in with Google. Navigates new users to the welcome page
   * and existing users to the dashboard.
   */
  async signInWithGoogle(inviteId?: string) {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(this.auth, provider);

      const additionalInfo = getAdditionalUserInfo(userCredential);
      if (additionalInfo?.isNewUser) {
        // This is a new user signing up with Google
        await this.createUserProfile(userCredential.user);
        // ADDED: Navigate the new user to the welcome page.
        if(inviteId){
          // await this.familiesService.joinFamily(inviteId)
          await this.switchActiveFamily(inviteId)
        }
        this.router.navigate(['/welcome']);
      } else {
        // This is an existing user logging in with Google
        // ADDED: Navigate the existing user to the dashboard.
        this.router.navigate(['']);
      }
      
      return userCredential;
    } catch (error) {
      console.error("Error during Google sign in:", error);
      throw error;
    }
  }

  async signOut() {
    try {
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  }

  private async createUserProfile(user: User, additionalData: { [key: string]: any } = {}) {
    if (!user) {
      throw new Error("User object is missing for profile creation.");
    }
    
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    
    const userData = {
      uid: user.uid,
      email: user.email,
      name: user.displayName || additionalData['name'],
      createdAt: new Date(),
      ...additionalData
    };
    
    await setDoc(userDocRef, userData);
  }

  async updateUserDisplayName(name: string): Promise<void> {
    const user = this.currentUser();
    if (!user) throw new Error("User must be logged in to update their name.");

    // 1. Update the Firebase Authentication user profile
    await updateProfile(user, { displayName: name });

    // 2. Update the user's document in the 'users' collection in Firestore
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    await updateDoc(userDocRef, { name: name });

    // 3. Manually refresh the currentUser signal to reflect the change immediately
    this.currentUser.set({ ...user, displayName: name });
  }

  ngOnDestroy() {
    this.authStateSubscription.unsubscribe();
  }
}