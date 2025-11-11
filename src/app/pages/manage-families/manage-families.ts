import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

// We only need the FamiliesService for this component's logic
import { Families } from '../../core/families'; // Adjust path
@Component({
  selector: 'app-manage-families',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './manage-families.html',
  styleUrl: './manage-families.css',
})
export class ManageFamilies {
  private familiesService = inject(Families);

  // Signals for the form inputs
  newFamilyName = signal('');
  inviteCode = signal('');

  // Signals for robust UI feedback
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  /**
   * Creates a new family circle. The service will automatically make it the active circle.
   */
  async createHub(): Promise<void> {
    if (!this.newFamilyName().trim()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.familiesService.createFamily(this.newFamilyName().trim());
      // The service automatically navigates back to the dashboard on success.
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to create circle.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Joins an existing family circle. The service will automatically make it the active circle.
   */
  async joinHub(): Promise<void> {
    if (!this.inviteCode().trim()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.familiesService.joinFamily(this.inviteCode().trim());
      // The service automatically navigates back to the dashboard on success.
    } catch (error: any) {
      // Provide a user-friendly error for a common issue
      if (error.message.includes("No family found")) {
        this.errorMessage.set("Invalid invite code. Please check and try again.");
      } else {
        this.errorMessage.set(error.message || 'Failed to join circle.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
