import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');


export const createStripeCheckout = onCall({ 
  secrets: [stripeSecretKey], 
}, async (request) => {
  const { priceId, email, familyId } = request.data;

  const stripe = new Stripe(stripeSecretKey.value(), {
    apiVersion: '2025-10-29.clover',
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: 'https://thefamilee.app/profile',
    cancel_url: 'https://thefamilee.app/profile',
    customer_email: email,
    metadata: {
      familyId: familyId,
    },
  });

  return { sessionId: session.id, url: session.url };
});
