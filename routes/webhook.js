const express = require("express");

const verifySignature = require("../utils/verifySignature");
const createShopifyOrder = require("../services/shopify");

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        // Razorpay Signature
        const signature = req.headers["x-razorpay-signature"];

        if (!signature) {
            return res.status(400).json({
                success: false,
                message: "Missing Razorpay signature."
            });
        }

        // Verify Webhook Signature
        const isValid = verifySignature(req.body, signature);

        if (!isValid) {
            console.error("❌ Invalid Razorpay Signature");

            return res.status(401).json({
                success: false,
                message: "Invalid webhook signature."
            });
        }

        // Parse Raw Body
        const payload = JSON.parse(req.body.toString("utf8"));

        console.log("✅ Razorpay Webhook Verified");

        // Only process successful payments
        if (payload.event !== "payment.captured") {
            console.log(`Ignoring event: ${payload.event}`);

            return res.status(200).json({
                success: true,
                message: "Event ignored."
            });
        }

        const payment = payload.payload?.payment?.entity;

        if (!payment) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment payload."
            });
        }

        // Required fields
        if (!payment.id) {
            return res.status(400).json({
                success: false,
                message: "Missing payment ID."
            });
        }

        if (!payment.email) {
            return res.status(400).json({
                success: false,
                message: "Customer email is required."
            });
        }

        // Customer object for Shopify
        const customer = {
            name:
                payment.name ||
                payment.notes?.name ||
                "",

            email: payment.email,

            phone: payment.contact || "",

            amount: payment.amount / 100,

            currency: payment.currency,

            paymentId: payment.id,

            orderId: payment.order_id || ""
        };

        console.log("======================================");
        console.log("💳 Payment Captured");
        console.log(`Payment ID : ${customer.paymentId}`);
        console.log(`Order ID   : ${customer.orderId}`);
        console.log(`Name       : ${customer.name}`);
        console.log(`Email      : ${customer.email}`);
        console.log(`Phone      : ${customer.phone}`);
        console.log(`Amount     : ₹${customer.amount}`);
        console.log("======================================");

        const order = await createShopifyOrder(customer);

        console.log(
            `✅ Shopify Order Created (#${order.order_number || order.name})`
        );

        return res.status(200).json({
            success: true,
            message: "Shopify order created successfully.",
            orderId: order.id,
            orderName: order.name
        });
    } catch (error) {
        console.error("======================================");
        console.error("❌ Webhook Error");
        console.error(error.response?.data || error.message);
        console.error("======================================");

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

module.exports = router;