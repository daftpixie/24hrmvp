"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const payment_1 = require("../services/payment");
const payment_2 = require("../middleware/payment");
const router = (0, express_1.Router)();
router.post('/create', auth_1.authenticate, async (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { tier = 'standard', currency = 'usd' } = req.body;
    const tierConfig = payment_2.PAYMENT_TIERS.find(t => t.name === tier);
    if (!tierConfig) {
        res.status(400).json({ error: 'Invalid tier' });
        return;
    }
    try {
        const payment = await (0, payment_1.createPayment)(req.user.id, tierConfig.price, currency);
        res.json(payment);
    }
    catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({ error: 'Payment creation failed' });
    }
});
router.get('/verify/:paymentId', auth_1.authenticate, async (req, res) => {
    const { paymentId } = req.params;
    try {
        const result = await (0, payment_1.verifyPayment)(paymentId);
        res.json(result);
    }
    catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});
router.post('/refund', auth_1.authenticate, async (req, res) => {
    const { paymentId, reason } = req.body;
    try {
        const result = await (0, payment_1.refundPayment)(paymentId, reason);
        res.json(result);
    }
    catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({ error: 'Refund failed' });
    }
});
router.get('/pricing', (_req, res) => {
    res.json({ tiers: payment_2.PAYMENT_TIERS });
});
exports.default = router;
//# sourceMappingURL=payment.js.map