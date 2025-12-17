import Stripe from 'stripe';
import { prisma } from '../index';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia' as any,
  typescript: true
});

export enum PaymentMethod {
  STRIPE = 'stripe',
  COINBASE = 'coinbase',
  X402 = 'x402'
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  provider: PaymentMethod;
  status: 'pending' | 'completed' | 'failed';
  amount?: number;
  currency?: string;
}

export async function createPayment(
  userId: string,
  amount: number,
  currency: string = 'usd',
  method: PaymentMethod = PaymentMethod.STRIPE,
  metadata: Record<string, string> = {}
): Promise<PaymentResult> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata: {
      ...metadata,
      userId
    }
  });

  // Store in database
  await prisma.payment.create({
    data: {
      userId,
      amount,
      currency,
      status: 'pending',
      provider: method,
      providerTxId: paymentIntent.id,
      metadata: metadata as any
    }
  });

  return {
    success: true,
    transactionId: paymentIntent.id,
    provider: method,
    status: 'pending',
    amount,
    currency
  };
}

export async function verifyPayment(paymentId: string): Promise<PaymentResult> {
  // Check in database first
  const payment = await prisma.payment.findUnique({
    where: { providerTxId: paymentId }
  });

  if (!payment) {
    return {
      success: false,
      transactionId: paymentId,
      provider: PaymentMethod.STRIPE,
      status: 'failed'
    };
  }

  // Verify with Stripe
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
    
    const status = paymentIntent.status === 'succeeded' ? 'completed' : 
                   paymentIntent.status === 'processing' ? 'pending' : 'failed';

    // Update database
    await prisma.payment.update({
      where: { providerTxId: paymentId },
      data: { status }
    });

    return {
      success: status === 'completed',
      transactionId: paymentId,
      provider: payment.provider as PaymentMethod,
      status,
      amount: payment.amount.toNumber(),
      currency: payment.currency
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      transactionId: paymentId,
      provider: payment.provider as PaymentMethod,
      status: 'failed'
    };
  }
}

export async function refundPayment(
  paymentId: string,
  reason?: string
): Promise<PaymentResult> {
  const payment = await prisma.payment.findUnique({
    where: { providerTxId: paymentId }
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentId,
      reason: reason as any
    });

    await prisma.payment.update({
      where: { providerTxId: paymentId },
      data: { 
        status: 'refunded',
        metadata: {
          ...(payment.metadata as any),
          refundId: refund.id,
          refundReason: reason
        } as any
      }
    });

    return {
      success: true,
      transactionId: paymentId,
      provider: payment.provider as PaymentMethod,
      status: 'completed',
      amount: payment.amount.toNumber(),
      currency: payment.currency
    };
  } catch (error) {
    console.error('Refund error:', error);
    throw new Error('Refund failed');
  }
}

export async function createPaymentIntent(
  amount: number,
  currency: string = 'usd',
  metadata: Record<string, string> = {}
): Promise<PaymentResult> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata
  });

  return {
    success: true,
    transactionId: paymentIntent.id,
    provider: PaymentMethod.STRIPE,
    status: 'pending'
  };
}

export { stripe };
