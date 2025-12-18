import { Component, inject, signal } from '@angular/core';

import { RouterLink } from '@angular/router';

import { StripeService } from '../../core/stripe'; // Adjust path as needed

@Component({
  selector: 'app-pricing',
  imports: [RouterLink],
  templateUrl: './pricing.html',
  styleUrls: ['./pricing.css']
})
export class Pricing {
  private stripeService = inject(StripeService);

  // --- State Signals ---
  billingCycle = signal<'month' | 'year'>('month');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // --- Your Price IDs from the Stripe Dashboard ---
  private readonly monthlyPriceId = 'price_1SSLJvJblgCw5364OjCpp2Ok';
  private readonly yearlyPriceId = 'price_1SSLLTJblgCw5364W6y2SLA9';

  /**
   * Calls the StripeService to handle the checkout process.
   * The component's only job is to pick the right price ID.
   */
  async upgrade(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const priceId = this.billingCycle() === 'month'
      ? this.monthlyPriceId
      : this.yearlyPriceId;

    try {
      await this.stripeService.redirectToCheckout(priceId);
    } catch (error: any) {
      this.errorMessage.set(error.message || 'An unexpected error occurred. Please try again.');
      this.isLoading.set(false); // Only set to false if an error occurs.
    }
  }
}