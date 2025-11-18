import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';

// Set the region to us-central1
setGlobalOptions({ region: 'us-central1' });

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const webhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

export const stripeWebhook = onRequest(
  { 
    secrets: [stripeSecretKey, webhookSecret],  
  }, 
  async (request, response) => {
    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: '2025-10-29.clover',
    });

    const sig = request.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(request.rawBody, sig, webhookSecret.value());
    } catch (err: any) {
      logger.error(`Webhook signature verification failed.`, err.message);
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    const firestore = getFirestore();

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.familyId && session.customer_details?.email && session.subscription) {
            const familyId = session.metadata.familyId;
            const userEmail = session.customer_details.email;
            const subscriptionId = session.subscription.toString();
            const customerId = session.customer?.toString();

            const familyRef = firestore.collection('families').doc(familyId);

            try {
                await familyRef.update({
                    'subscription.type': 'paid',
                    'subscription.payingUser': userEmail,
                    'subscription.stripeSubscriptionId': subscriptionId,
                    'subscription.stripeCustomerId': customerId,
                });
                logger.info(`Successfully upgraded family ${familyId} to premium.`);
            } catch (error) {
                logger.error(`Error updating family ${familyId}:`, error);
            }
        } else {
          logger.warn(`Checkout session completed with incomplete data.`);
        }
      } else if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        const familiesRef = firestore.collection('families');
        const q = familiesRef.where('subscription.stripeSubscriptionId', '==', subscriptionId).limit(1);

        try {
            const snapshot = await q.get();
            if (!snapshot.empty) {
                const familyDoc = snapshot.docs[0];
                await familyDoc.ref.update({
                    'subscription.type': 'free',
                    'subscription.payingUser': null,
                    'subscription.stripeSubscriptionId': null,
                    'subscription.stripeCustomerId': null,
                });
                logger.info(`Successfully cancelled subscription for family ${familyDoc.id}.`);
            }
        } catch (error) {
            logger.error(`Error canceling subscription ${subscriptionId}:`, error);
        }
      }

    response.status(200).send();
  });
