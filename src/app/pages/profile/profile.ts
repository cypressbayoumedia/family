import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StripeService } from '../../core/stripe';
import { AuthService } from '../../core/auth';
import { Families } from '../../core/families';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class Profile implements OnInit {
  authService = inject(AuthService);
  familiesService = inject(Families);
  stripeService = inject(StripeService)

  // --- Signals for Form State ---
  editableName = signal('');
  newProfilePicFile = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);

  // --- Signals for UI Feedback ---
  isLoading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  
  // Expose service signals directly to the template
  currentUser = this.authService.currentUser;
  allUserFamilies = this.familiesService.allUserFamilies;

  // private priceId = 'price_1STlkCJblgCw5364qsohDh7t';
  subError = signal<string | null>(null);

  ngOnInit(): void {
    this.editableName.set(this.currentUser()?.displayName || '');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      this.newProfilePicFile.set(file);
      this.imagePreviewUrl.set(URL.createObjectURL(file));
    }
  }

  async saveProfile(): Promise<void> {
    this.isLoading.set(true);
    this.resetMessages();

    try {
      let changesMade = false;
      if (this.editableName() !== this.currentUser()?.displayName) {
        await this.authService.updateUserDisplayName(this.editableName());
        changesMade = true;
      }

      if (this.newProfilePicFile()) {
        await this.authService.updateProfilePicture(this.newProfilePicFile()!);
        changesMade = true;
      }
      
      if (changesMade) {
        this.successMessage.set("Profile updated successfully!");
      }
      this.newProfilePicFile.set(null);
      this.imagePreviewUrl.set(null);

    } catch (error: any) {
      this.errorMessage.set(error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteAccount(): Promise<void> {
    const confirmation = confirm(
      "Are you absolutely sure you want to delete your account? " +
      "This is irreversible and will remove you from all family hubs."
    );
    if (!confirmation) return;

    this.isLoading.set(true);
    this.resetMessages();
    try {
      await this.authService.deleteAccount();
    } catch (error: any) {
      this.errorMessage.set(error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async goToBillingPortal(): Promise<void> {
    this.isLoading.set(true);
    this.subError.set(null);
    try {
      // The component's job is simple: call the service.
      await this.stripeService.redirectToBillingPortal();
    } catch (error: any) {
      this.subError.set(error.message);
      this.isLoading.set(false);
    }
  }


  private resetMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }
}
