import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Functions, httpsCallable } from '@angular/fire/functions';

// Import necessary services
import { Families } from '../../core/families';
import { AuthService } from '../../core/auth';
import { StripeService } from '../../core/stripe';
@Component({
  selector: 'app-manage-families',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './manage-families.html',
  styleUrl: './manage-families.css',
})
export class ManageFamilies {
  private familiesService = inject(Families);
  private authService = inject(AuthService);
  private stripeService = inject(StripeService)
  private functions = inject(Functions);

  // --- Signals for Form Inputs ---
  newFamilyName = signal('');
  inviteCode = signal('');

  // --- Signals for UI Feedback ---
  isLoading = signal(false);
  // Separate error signals for better contextual feedback
  createJoinError = signal<string | null>(null);
  subError = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // --- Signals from Services ---
  currentUser = this.authService.currentUser;
  activeFamily = this.familiesService.activeFamily;

  // --- Computed Signals ---
  isSubscriptionOwner = computed(() => {
    const family = this.activeFamily();
    const user = this.currentUser();
    if (!family?.subscription || !user) return false;
    return family.subscription.payingUser === user.email;
  });

  // Hardcoded Stripe Price ID for the premium plan
  private priceId = 'price_1SSLJvJblgCw5364OjCpp2Ok';

  /**
   * Creates a new family circle.
   */
  async createHub(): Promise<void> {
    if (!this.newFamilyName().trim()) return;

    this.isLoading.set(true);
    this.createJoinError.set(null);
    this.successMessage.set(null);

    try {
      await this.familiesService.createFamily(this.newFamilyName().trim());
      // The service automatically navigates on success.
    } catch (error: any) {
      this.createJoinError.set(error.message || 'Failed to create circle.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Joins an existing family circle.
   */
  async joinHub(): Promise<void> {
    if (!this.inviteCode().trim()) return;

    this.isLoading.set(true);
    this.createJoinError.set(null);
    this.successMessage.set(null);

    try {
      await this.familiesService.joinFamily(this.inviteCode().trim());
      // The service automatically navigates on success.
    } catch (error: any) {
      if (error.message.includes("No family found")) {
        this.createJoinError.set("Invalid invite code. Please check and try again.");
      } else {
        this.createJoinError.set(error.message || 'Failed to join circle.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Redirects the user to the Stripe checkout page.
   */
  async goToCheckout(): Promise<void> {
    this.isLoading.set(true);
    this.subError.set(null);
    try {
      // The component's job is simple: call the service.
      await this.stripeService.redirectToCheckout(this.priceId);
      // The user is redirected, so no need to set isLoading to false here.
    } catch (error: any) {
      this.subError.set(error.message);
      this.isLoading.set(false); // Only set to false if an error occurs.
    }
  }


  /**
   * Redirects the user to the Stripe billing portal.
   */
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
}
