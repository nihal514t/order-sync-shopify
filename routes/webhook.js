const express = require("express");

const verifySignature = require("../utils/verifySignature");
const createShopifyOrder = require("../services/shopify");

const router = express.Router();

router.post("/", async (req, res) => {
    try {

        const signature = req.headers["x-razorpay-signature"];

        if (!signature) {
            return res.status(400).json({
                success: false,
                message: "Missing Razorpay Signature"
            });
        }

        const isValid = verifySignature(
            req.body,
            signature
        );

        if (!isValid) {
            console.log("❌ Invalid Razorpay Signature");

            return res.status(400).json({
                success: false,
                message: "Invalid Signature"
            });
        }

        const payload = JSON.parse(req.body.toString());

        console.log("✅ Webhook Verified");

        if (payload.event !== "payment.captured") {
            return res.status(200).json({
                success: true,
                message: "Ignored Event"
            });
        }

        const payment = payload.payload.payment.entity;

        const customer = {
               name: payment.notes?.name || "",
               email: payment.email || "",
               phone: payment.contact || "",
               amount: payment.amount / 100,
               paymentId: payment.id
            };

        console.log("💳 Payment Received:");
        console.log(customer);

        const order = await createShopifyOrder(customer);

        console.log("✅ Shopify Order Created");

        return res.status(200).json({
            success: true,
            orderId: order.id,
            orderName: order.name
        });

    } catch (error) {

        console.error("Webhook Error:", error.response?.data || error.message);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
});

module.exports = router;