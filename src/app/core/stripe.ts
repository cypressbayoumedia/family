import { inject, Injectable } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private functions = inject(Functions);

  createCheckoutSession(priceId: string, email: string, familyId: string): Observable<any> {
    const createStripeCheckout = httpsCallable(this.functions, 'createStripeCheckout');
    return from(createStripeCheckout({ priceId, email, familyId }));
  }

  createBillingPortal(customerId: string): Observable<any> {
    const createBillingPortal = httpsCallable(this.functions, 'createBillingPortal');
    return from(createBillingPortal({ customerId }));
  }
}
