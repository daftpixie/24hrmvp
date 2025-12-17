"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripe = exports.PaymentMethod = void 0;
exports.createPayment = createPayment;
exports.verifyPayment = verifyPayment;
exports.refundPayment = refundPayment;
exports.createPaymentIntent = createPaymentIntent;
const stripe_1 = __importDefault(require("stripe"));
const index_1 = require("../index");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-11-20.acacia',
    typescript: true
});
exports.stripe = stripe;
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["STRIPE"] = "stripe";
    PaymentMethod["COINBASE"] = "coinbase";
    PaymentMethod["X402"] = "x402";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
async function createPayment(userId, amount, currency = 'usd', method = PaymentMethod.STRIPE, metadata = {}) {
    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        metadata: {
            ...metadata,
            userId
        }
    });
    // Store in database
    await index_1.prisma.payment.create({
        data: {
            userId,
            amount,
            currency,
            status: 'pending',
            provider: method,
            providerTxId: paymentIntent.id,
            metadata: metadata
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
async function verifyPayment(paymentId) {
    // Check in database first
    const payment = await index_1.prisma.payment.findUnique({
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
        await index_1.prisma.payment.update({
            where: { providerTxId: paymentId },
            data: { status }
        });
        return {
            success: status === 'completed',
            transactionId: paymentId,
            provider: payment.provider,
            status,
            amount: payment.amount.toNumber(),
            currency: payment.currency
        };
    }
    catch (error) {
        console.error('Payment verification error:', error);
        return {
            success: false,
            transactionId: paymentId,
            provider: payment.provider,
            status: 'failed'
        };
    }
}
async function refundPayment(paymentId, reason) {
    const payment = await index_1.prisma.payment.findUnique({
        where: { providerTxId: paymentId }
    });
    if (!payment) {
        throw new Error('Payment not found');
    }
    try {
        const refund = await stripe.refunds.create({
            payment_intent: paymentId,
            reason: reason
        });
        await index_1.prisma.payment.update({
            where: { providerTxId: paymentId },
            data: {
                status: 'refunded',
                metadata: {
                    ...payment.metadata,
                    refundId: refund.id,
                    refundReason: reason
                }
            }
        });
        return {
            success: true,
            transactionId: paymentId,
            provider: payment.provider,
            status: 'completed',
            amount: payment.amount.toNumber(),
            currency: payment.currency
        };
    }
    catch (error) {
        console.error('Refund error:', error);
        throw new Error('Refund failed');
    }
}
async function createPaymentIntent(amount, currency = 'usd', metadata = {}) {
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
//# sourceMappingURL=payment.js.map