import { Injectable, inject, signal } from '@angular/core';
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
import { toSignal } from '@angular/core/rxjs-interop';
import {
  doc,
  Firestore,
  setDoc,
  updateDoc,
  docData,
} from '@angular/fire/firestore';
import { getFunctions, httpsCallable } from '@angular/fire/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { deleteUser } from '@angular/fire/auth';
import { of, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL?: string;
  birthday?: string;
  birthdayMonthDay?: string;
  activeFamilyId?: string;
  familyMemberships?: { familyId: string; role: string }[];
  createdAt?: any; // or Timestamp
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth: Auth = inject(Auth);
  private readonly firestore: Firestore = inject(Firestore);
  private readonly router: Router = inject(Router);
  private readonly storage = getStorage();

  public readonly user$ = authState(this.auth);
  public readonly currentUser = toSignal(this.user$, { initialValue: null });
  public readonly loading = signal<boolean>(false);

  private readonly userProfile$ = this.user$.pipe(
    switchMap(user => {
      if (!user) return of(null);
      return docData(doc(this.firestore, `users/${user.uid}`)) as Observable<UserProfile>;
    })
  );
  public readonly userProfile = toSignal(this.userProfile$, { initialValue: null });


  getUserProfile(uid: string): Observable<UserProfile | undefined> {
    return docData(doc(this.firestore, `users/${uid}`)) as Observable<UserProfile | undefined>;
  }


  constructor() {
    // No subscription needed anymore, toSignal handles it.
  }

  /**
   * Signs up a new user and navigates them to the welcome/onboarding component.
   */
  async signUpWithEmail(name: string, email: string, password: string, inviteId?: string) {
    this.loading.set(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);

      await this.createUserProfile(userCredential.user, { name });
      if (inviteId) {
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
    } finally {
      this.loading.set(false);
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
    this.loading.set(true);
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);

      if (inviteId) {
        await this.joinFamily(inviteId)
        await this.switchActiveFamily(inviteId)
      }
      this.router.navigate(['']);

      return userCredential;
    } catch (error) {
      console.error("Error during email sign in:", error);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Signs in with Google. Navigates new users to the welcome page
   * and existing users to the dashboard.
   */
  async signInWithGoogle(inviteId?: string) {
    this.loading.set(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(this.auth, provider);

      const additionalInfo = getAdditionalUserInfo(userCredential);

      if (additionalInfo?.isNewUser) {
        // This is a new user signing up with Google
        await this.createUserProfile(userCredential.user);
        // ADDED: Navigate the new user to the welcome page.
        if (inviteId) {
          await this.joinFamily(inviteId)
          await this.switchActiveFamily(inviteId)
        }
        this.router.navigate(['/welcome']);
      } else {
        // This is an existing user logging in with Google
        // ADDED: Navigate the existing user to the dashboard.
        if (inviteId) {
          await this.joinFamily(inviteId)
          await this.switchActiveFamily(inviteId)
        }
        this.router.navigate(['']);
      }

      return userCredential;
    } catch (error) {
      console.error("Error during Google sign in:", error);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  async signOut() {
    this.loading.set(true);
    try {
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error("Error during sign out:", error);
    } finally {
      this.loading.set(false);
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
    // this.currentUser.set(this.auth.currentUser); <-- NO LONGER NEEDED toSignal will update it.
  }

  /**
   * Uploads a new profile picture and correctly updates the local state.
   */
  async updateProfilePicture(file: File): Promise<void> {
    const user = this.currentUser();
    if (!user) throw new Error("User must be logged in to update their picture.");
    this.loading.set(true);

    const filePath = `users/${user.uid}/profile.${file.name.split('.').pop()}`;
    const storageRef = ref(this.storage, filePath);
    const snapshot = await uploadBytes(storageRef, file);
    const photoURL = await getDownloadURL(snapshot.ref);

    // Update the Auth profile
    await updateProfile(user, { photoURL });

    // Update the Firestore document
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    await updateDoc(userDocRef, { photoURL });
    this.loading.set(false);
    // THE FIX: Again, set the signal to the now-updated LIVE currentUser.
    // this.currentUser.set(this.auth.currentUser); <-- NO LONGER NEEDED toSignal will update it.
  }

  /**
   * Deletes the user's account. This will now work correctly.
   */
  async deleteAccount(): Promise<void> {
    const user = this.currentUser();
    if (!user) throw new Error("No user is currently logged in to delete.");

    this.loading.set(true);
    try {
      // Now, 'user' is the live User instance, so this call will succeed.
      await deleteUser(user);
      this.router.navigate(['/login']);
    } catch (error: any) {
      console.error("Error deleting account:", error);
      throw new Error("Account deletion failed. Please sign out and sign in again before retrying.");
    } finally {
      this.loading.set(false);
    }
  }

  // ngOnDestroy is no longer needed because toSignal handles the subscription.

  async updateBirthday(date: string): Promise<void> {
    const user = this.currentUser();
    if (!user) throw new Error("User must be logged in to update birthday.");

    const birthdayDate = new Date(date);
    const month = (birthdayDate.getMonth() + 1).toString().padStart(2, '0');
    const day = birthdayDate.getDate().toString().padStart(2, '0');
    const birthdayMonthDay = `${month}-${day}`;

    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    await updateDoc(userDocRef, {
      birthday: date, // YYYY-MM-DD
      birthdayMonthDay: birthdayMonthDay // MM-DD for easier querying
    });
  }
}
