require("dotenv").config();

const express = require("express");

const webhookRoutes = require("./routes/webhook");

const app = express();

const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

// Health Check
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Razorpay Shopify Sync API is running 🚀",
        environment: process.env.NODE_ENV || "development"
    });
});

// Razorpay Webhook
// IMPORTANT: Must receive the raw request body for signature verification.
app.use(
    "/api/webhook",
    express.raw({
        type: "application/json"
    }),
    webhookRoutes
);

// JSON parser for future routes
app.use(express.json());

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("======================================");
    console.error("Server Error");
    console.error(err.stack || err);
    console.error("======================================");

    res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`
=========================================
 Razorpay Shopify Sync Started
=========================================
 Port        : ${PORT}
 Environment : ${process.env.NODE_ENV || "development"}
 Shopify Shop: ${process.env.SHOPIFY_SHOP || "Not Configured"}
=========================================
`);
});