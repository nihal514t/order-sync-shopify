require("dotenv").config();

const express = require("express");

const webhookRoutes = require("./routes/webhook");

const app = express();

const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Razorpay Shopify Sync API is running 🚀",
        environment:
            process.env.NODE_ENV || "development"
    });
});

app.use(
    "/api/webhook",
    express.raw({
        type: "application/json"
    }),
    webhookRoutes
);

app.use(express.json());

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

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

app.listen(PORT, () => {
    console.log(
        `Razorpay Shopify Sync Started on port ${PORT}`
    );
});