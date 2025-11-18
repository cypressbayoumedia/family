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

export const createBillingPortal = onCall({ 
  secrets: [stripeSecretKey], 
  cors: corsOrigins, 
  invoker: 'public' 
}, async (request) => {
  const { customerId } = request.data;

  const stripe = new Stripe(stripeSecretKey.value(), {
    apiVersion: '2025-10-29.clover',
  });

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.APP_URL}/profile`,
  });

  return { url: session.url };
});
