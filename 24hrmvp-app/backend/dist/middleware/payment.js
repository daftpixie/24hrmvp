"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalPayment = exports.requirePayment = exports.PAYMENT_TIERS = void 0;
const payment_1 = require("../services/payment");
const index_1 = require("../index");
exports.PAYMENT_TIERS = [
    { name: 'standard', price: 1, votes: 1, boosts: 0 },
    { name: 'priority', price: 5, votes: 3, boosts: 1 },
    { name: 'premium', price: 20, votes: 10, boosts: 3 },
];
const requirePayment = (tier) => {
    return async (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const paymentId = req.body.paymentId || req.query.paymentId;
        if (!paymentId) {
            res.status(402).json({
                error: 'Payment required',
                tier,
                tiers: exports.PAYMENT_TIERS
            });
            return;
        }
        try {
            const existingPayment = await index_1.prisma.payment.findUnique({
                where: { providerTxId: paymentId }
            });
            if (existingPayment && existingPayment.status === 'completed') {
                next();
                return;
            }
            await index_1.prisma.payment.create({
                data: {
                    userId: req.user.id,
                    amount: exports.PAYMENT_TIERS.find(t => t.name === tier)?.price || 0,
                    currency: 'usd',
                    status: 'pending',
                    provider: payment_1.PaymentMethod.STRIPE,
                    providerTxId: paymentId,
                }
            });
            const verification = await (0, payment_1.verifyPayment)(paymentId);
            if (verification.success && verification.status === 'completed') {
                next();
            }
            else {
                res.status(402).json({
                    error: 'Payment verification failed',
                    status: verification.status
                });
            }
        }
        catch (error) {
            console.error('Payment verification error:', error);
            res.status(500).json({ error: 'Payment verification failed' });
        }
    };
};
exports.requirePayment = requirePayment;
const optionalPayment = (tier) => {
    return async (req, _res, next) => {
        const paymentId = req.body.paymentId || req.query.paymentId;
        if (!paymentId) {
            next();
            return;
        }
        try {
            const payment = await index_1.prisma.payment.create({
                data: {
                    userId: req.user.id,
                    amount: exports.PAYMENT_TIERS.find(t => t.name === tier)?.price || 0,
                    currency: 'usd',
                    status: 'pending',
                    provider: payment_1.PaymentMethod.STRIPE,
                    providerTxId: paymentId,
                }
            });
            const verification = await (0, payment_1.verifyPayment)(payment.providerTxId);
            if (verification.success) {
                req.paymentVerified = true;
                req.paymentTier = tier;
            }
        }
        catch (error) {
            console.error('Optional payment error:', error);
        }
        next();
    };
};
exports.optionalPayment = optionalPayment;
//# sourceMappingURL=payment.js.map