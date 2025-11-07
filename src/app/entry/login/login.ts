import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth'; // Adjust path as needed

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'] // Share CSS with signup
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private route = inject(ActivatedRoute);
  // Form state signals
  email = signal('');
  password = signal('');

  // UI state signals
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  inviteId = signal<string | null>(null);
  /**
   * Handles the email/password login process.
   */
  async onLogin(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.signInWithEmail(this.email(), this.password(),this.inviteId() ?? undefined);
    } catch (error: any) {
      this.errorMessage.set(this.formatFirebaseError(error.code));
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Handles the Google Sign-In process.
   */
  async onGoogleLogin(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.signInWithGoogle(this.inviteId() ?? undefined);
      
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
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password. Please try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}