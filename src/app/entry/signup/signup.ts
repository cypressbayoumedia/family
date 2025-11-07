import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth'; // Adjust path as needed
import { Families } from '../../core/families';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrls: ['./signup.css']
})
export class Signup {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private route = inject(ActivatedRoute);
  private familiesService = inject(Families);

  // Form state signals
  name = signal('');
  email = signal('');
  password = signal('');

  // UI state signals
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  inviteId = signal<string | null>(null);
  /**
   * Handles the email/password signup process.
   */
  async onSignup(): Promise<void> {
    if (!this.name() || !this.email() || !this.password()) {
      this.errorMessage.set('All fields are required.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.signUpWithEmail(this.name(), this.email(), this.password(),this.inviteId() ?? undefined);
      // Navigate to a protected route on success
    } catch (error: any) {
      this.errorMessage.set(this.formatFirebaseError(error.code));
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Handles the Google Sign-In process.
   */
  async onGoogleSignup(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.signInWithGoogle(this.inviteId() ?? undefined);
       // Navigate on success
    } catch (error: any) {
      this.errorMessage.set(this.formatFirebaseError(error.code));
    } finally {
      this.isLoading.set(false);
    }
  }
  
  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.inviteId.set(params.get('inviteId'));
    });
  }

  /**
   * A helper to format common Firebase auth errors into user-friendly messages.
   */
  private formatFirebaseError(errorCode: string): string {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email address is already in use.';
      case 'auth/weak-password':
        return 'The password must be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}