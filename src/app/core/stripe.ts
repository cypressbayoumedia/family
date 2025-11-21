import { Injectable, inject } from '@angular/core'; 
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Families} from './families';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private functions = inject(Functions);
  private familiesService = inject(Families);
  private authService = inject(AuthService);

  async redirectToCheckout(priceId: string): Promise<void> {
    const familyId = this.familiesService.activeFamilyId();
    const user = this.authService.currentUser();
    
    if (!familyId || !user?.email) {
      throw new Error("User or active family is not available to start a checkout session.");
    }

    const createCheckoutFn = httpsCallable(this.functions, 'createStripeCheckout');
    
    try {
      const result = await createCheckoutFn({
        priceId,
        email: user.email,
        familyId,
      }) as { data: { url?: string } };

      if (result.data.url) {
        // This is the key action: redirect the user to Stripe's hosted page.
        window.location.href = result.data.url;
      } else {
        throw new Error('Could not create checkout session URL.');
      }
    } catch (error) {
      console.error("Stripe Checkout creation failed:", error);
      // Re-throw a user-friendly error to be caught by the component
      throw new Error("Could not connect to the payment gateway. Please try again later.");
    }
  }

  async redirectToBillingPortal(): Promise<void> {
    const family = this.familiesService.activeFamily();
    const customerId = family?.subscription?.stripeCustomerId;

    if (!customerId) {
      throw new Error("No active subscription found for this family hub.");
    }

    const createPortalFn = httpsCallable(this.functions, 'createBillingPortal');

    try {
      const result = await createPortalFn({ customerId }) as { data: { url?: string } };

      if (result.data.url) {
        // Redirect the user to their personal Stripe management page.
        window.location.href = result.data.url;
      } else {
        throw new Error('Could not open billing portal URL.');
      }
    } catch (error) {
      console.error("Stripe Billing Portal creation failed:", error);
      throw new Error("Could not open the subscription management page. Please try again later.");
    }
  }
}