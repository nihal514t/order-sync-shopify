require("dotenv").config();

const express = require("express");
const webhookRoutes = require("./routes/webhook");

const app = express();

const PORT = process.env.PORT || 3000;

// Health Check
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Razorpay Shopify Sync API is running 🚀"
    });
});

// Razorpay sends raw JSON.
// Do NOT use express.json() before the webhook route.
app.use(
    "/api/webhook",
    express.raw({
        type: "application/json"
    }),
    webhookRoutes
);

// JSON parser for any future routes
app.use(express.json());

// 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error("Server Error:", err);

    res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
});

app.listen(PORT, () => {
    console.log(`
=========================================
 Razorpay Shopify Sync Started
=========================================
 Port : ${PORT}
 Environment : ${process.env.NODE_ENV || "development"}
=========================================
`);
});