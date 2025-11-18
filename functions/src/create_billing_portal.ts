import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

export const createBillingPortal = onCall({ 
  secrets: [stripeSecretKey], 
}, async (request) => {
  const { customerId } = request.data;

  const stripe = new Stripe(stripeSecretKey.value(), {
    apiVersion: '2025-10-29.clover',
  });

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: 'https://thefamilee.app/profile',
  });

  return { url: session.url };
});
