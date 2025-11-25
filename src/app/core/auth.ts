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
  arrayUnion,
  doc,
  Firestore,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch
} from '@angular/fire/firestore';
import { Observable, Subscription } from 'rxjs';
import { Families } from './families';
import { getFunctions, httpsCallable } from '@angular/fire/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage'; // <-- Import Storage functions
import { deleteUser } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  public readonly auth: Auth = inject(Auth);
  public readonly firestore: Firestore = inject(Firestore);
  public readonly router: Router = inject(Router);
  public readonly storage = getStorage();
  public readonly currentUser = signal<User | null>(null);
  public readonly loading = signal<boolean>(true);

  public readonly authState$: Observable<User | null> = authState(this.auth);
  public authStateSubscription: Subscription;
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
       if(inviteId){
        
        await this.switchActiveFamily(inviteId)
        await this.joinFamily(inviteId)
      }
      // ADDED: Navigate new users to the welcome page to create/join a family.
      await this.updateUserDisplayName(name);

      
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

  async joinFamily(familyId: string, userName?: string): Promise<void> {
    const user = this.currentUser();
    if (!user) throw new Error("User must be logged in.");
    if (userName) await this.updateUserDisplayName(userName);
  
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

  /** this.router.navigate(['']);
   * Signs in an existing user and navigates them to the main dashboard.
   */
  async signInWithEmail(email: string, password: string, inviteId?: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      
      if(inviteId){
        await this.joinFamily(inviteId)
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
          await this.joinFamily(inviteId)
          await this.switchActiveFamily(inviteId)
        }
        this.router.navigate(['/welcome']);
      } else {
        // This is an existing user logging in with Google
        // ADDED: Navigate the existing user to the dashboard.
        if(inviteId){
          await this.joinFamily(inviteId)
          await this.switchActiveFamily(inviteId)
        }
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

    // 1. Update the Firebase Auth user profile
    await updateProfile(user, { displayName: name });

    // 2. Update the user's document in Firestore
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    await updateDoc(userDocRef, { name: name });

    // 3. THE FIX: Set the signal to the LIVE currentUser from the Auth SDK,
    // which is now updated. Do NOT create a copy.
    this.currentUser.set(this.auth.currentUser);
  }

  /**
   * Uploads a new profile picture and correctly updates the local state.
   */
  async updateProfilePicture(file: File): Promise<void> {
    const user = this.currentUser();
    if (!user) throw new Error("User must be logged in to update their picture.");

    const filePath = `users/${user.uid}/profile.${file.name.split('.').pop()}`;
    const storageRef = ref(this.storage, filePath);
    const snapshot = await uploadBytes(storageRef, file);
    const photoURL = await getDownloadURL(snapshot.ref);

    // Update the Auth profile
    await updateProfile(user, { photoURL });

    // Update the Firestore document
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    await updateDoc(userDocRef, { photoURL });

    // THE FIX: Again, set the signal to the now-updated LIVE currentUser.
    this.currentUser.set(this.auth.currentUser);
  }

  /**
   * Deletes the user's account. This will now work correctly.
   */
  async deleteAccount(): Promise<void> {
    const user = this.currentUser();
    if (!user) throw new Error("No user is currently logged in to delete.");

    try {
      // Now, 'user' is the live User instance, so this call will succeed.
      await deleteUser(user);
      this.router.navigate(['/login']);
    } catch (error: any) {
      console.error("Error deleting account:", error);
      throw new Error("Account deletion failed. Please sign out and sign in again before retrying.");
    }
  }


  ngOnDestroy() {
    this.authStateSubscription.unsubscribe();
  }
}
