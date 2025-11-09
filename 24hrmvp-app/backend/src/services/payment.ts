import Stripe from 'stripe';
import { Client, resources } from 'coinbase-commerce-node';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-10-28.acacia'
});

// Initialize Coinbase Commerce
Client.init(process.env.COINBASE_COMMERCE_API_KEY!);
const { Charge } = resources;

export type PaymentMethod = 'stripe' | 'coinbase';

export interface PaymentIntentResult {
  id: string;
  method: PaymentMethod;
  clientSecret?: string;
  hostedUrl?: string;
  amount: number;
  currency: string;
}

export async function createPayment(
  amount: number,
  method: PaymentMethod,
  userId: string,
  description: string
): Promise<PaymentIntentResult> {
  
  if (method === 'stripe') {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      metadata: {
        userId,
        platform: '24hrmvp',
        description
      }
    });

    return {
      id: paymentIntent.id,
      method: 'stripe',
      clientSecret: paymentIntent.client_secret!,
      amount,
      currency: 'usd'
    };
  } else {
    // Coinbase Commerce
    const charge = await Charge.create({
      name: '24HRMVP Submission',
      description,
      local_price: {
        amount: amount.toString(),
        currency: 'USD'
      },
      pricing_type: 'fixed_price',
      metadata: {
        userId,
        platform: '24hrmvp'
      }
    });

    return {
      id: charge.id,
      method: 'coinbase',
      hostedUrl: charge.hosted_url,
      amount,
      currency: 'usd'
    };
  }
}

export async function verifyPayment(
  paymentId: string,
  method: PaymentMethod
): Promise<boolean> {
  
  if (method === 'stripe') {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
    return paymentIntent.status === 'succeeded';
  } else {
    // Coinbase Commerce
    const charge = await Charge.retrieve(paymentId);
    return charge.timeline.some(event => event.status === 'COMPLETED');
  }
}

export async function refundPayment(
  paymentId: string,
  method: PaymentMethod,
  amount?: number
): Promise<boolean> {
  
  if (method === 'stripe') {
    const refund = await stripe.refunds.create({
      payment_intent: paymentId,
      amount: amount ? amount * 100 : undefined
    });
    return refund.status === 'succeeded';
  } else {
    // Coinbase Commerce doesn't support programmatic refunds
    // Manual process required through dashboard
    throw new Error('Crypto refunds must be processed manually through Coinbase Commerce dashboard');
  }
}
