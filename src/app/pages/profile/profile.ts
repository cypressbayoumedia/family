import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth';
import { Families } from '../../core/families';

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
  private router = inject(Router);

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

  ngOnInit(): void {
    // Initialize the editable name with the user's current name
    this.editableName.set(this.currentUser()?.displayName || '');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      this.newProfilePicFile.set(file);
      // Create a temporary URL for the preview
      this.imagePreviewUrl.set(URL.createObjectURL(file));
    }
  }

  async saveProfile(): Promise<void> {
    this.isLoading.set(true);
    this.resetMessages();

    try {
      let changesMade = false;
      // 1. Check if the name was changed
      if (this.editableName() !== this.currentUser()?.displayName) {
        await this.authService.updateUserDisplayName(this.editableName());
        changesMade = true;
      }

      // 2. Check if a new profile picture was selected
      if (this.newProfilePicFile()) {
        await this.authService.updateProfilePicture(this.newProfilePicFile()!);
        changesMade = true;
      }
      
      if (changesMade) {
        this.successMessage.set("Profile updated successfully!");
      }
      // Reset file input after successful upload
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
      // The service handles navigation on success
    } catch (error: any) {
      this.errorMessage.set(error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  private resetMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }
}