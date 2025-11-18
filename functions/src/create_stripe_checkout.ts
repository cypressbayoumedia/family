import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

const corsOrigins = [
  "https://9000-firebase-family-1762273868130.cluster-hlmk2l2htragyudeyf6f3tzsi6.cloudworkstations.dev",
  "http://localhost:4200",
  "https://thefamilee.app",
  new RegExp("https://.*\\.cloudworkstations\\.dev")
];

export const createStripeCheckout = onCall({ 
  secrets: [stripeSecretKey], 
  cors: corsOrigins, 
  invoker: 'public' 
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
    success_url: `${process.env.APP_URL}`,
    cancel_url: `${process.env.APP_URL}`,
    customer_email: email,
    metadata: {
      familyId: familyId,
    },
  });

  return { sessionId: session.id, url: session.url };
});
