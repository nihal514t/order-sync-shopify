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
                message: "Missing Razorpay signature."
            });
        }

        // Always verify signature in production
        const isValid = verifySignature(req.body, signature);

        if (!isValid) {
            console.error(`[${new Date().toISOString()}] Invalid Razorpay Signature`);

            return res.status(401).json({
                success: false,
                message: "Invalid webhook signature."
            });
        }

        let payload;

        try {
            payload = JSON.parse(req.body.toString("utf8"));
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: "Invalid JSON payload."
            });
        }

        console.log("======================================");
        console.log(`[${new Date().toISOString()}] Razorpay Webhook`);
        console.log(`Event : ${payload.event}`);
        console.log("======================================");

        // Ignore all other events
        if (payload.event !== "payment.captured") {
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

        if (payment.status !== "captured") {
            return res.status(200).json({
                success: true,
                message: "Payment not captured."
            });
        }

        if (!payment.id) {
            return res.status(400).json({
                success: false,
                message: "Payment ID missing."
            });
        }

        if (!payment.email) {
            return res.status(400).json({
                success: false,
                message: "Customer email missing."
            });
        }

        const customer = {
            name: payment.name || payment.notes?.name || "",
            email: payment.email,
            phone: payment.contact || "",
            amount: payment.amount / 100,
            currency: payment.currency || "INR",
            paymentId: payment.id,
            orderId: payment.order_id || ""
        };

        console.log("======================================");
        console.log("Payment Captured");
        console.log(`Payment ID : ${customer.paymentId}`);
        console.log(`Order ID   : ${customer.orderId}`);
        console.log(`Email      : ${customer.email}`);
        console.log(`Amount     : ₹${customer.amount}`);
        console.log("======================================");

        let order;

        try {
            order = await createShopifyOrder(customer);
        } catch (err) {

            // Duplicate webhook should still return 200
            if (
                err.message &&
                err.message.toLowerCase().includes("duplicate")
            ) {
                console.log("Duplicate webhook ignored.");

                return res.status(200).json({
                    success: true,
                    message: "Duplicate webhook ignored."
                });
            }

            throw err;
        }

        console.log("======================================");
        console.log("Shopify Order Created");
        console.log(`Shopify ID : ${order.id}`);
        console.log(`Order Name : ${order.name}`);
        console.log("======================================");

        return res.status(200).json({
            success: true,
            orderId: order.id,
            orderName: order.name
        });

    } catch (error) {

        console.error("======================================");
        console.error("Webhook Processing Failed");
        console.error(error.response?.data || error.stack || error.message);
        console.error("======================================");

        return res.status(500).json({
            success: false,
            message: "Webhook processing failed."
        });
    }
});

module.exports = router;