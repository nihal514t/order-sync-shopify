const axios = require("axios");
const crypto = require("crypto");

const META_API_VERSION =
    process.env.META_API_VERSION || "v23.0";

const META_CONFIG = {
    CURRENT: {
        pixelId: process.env.META_PIXEL_ID,
        accessToken: process.env.META_ACCESS_TOKEN
    },

    EDITING_BUNDLE: {
        pixelId: process.env.META_EDITING_PIXEL_ID,
        accessToken: process.env.META_EDITING_ACCESS_TOKEN
    }
};

const PRODUCT_META_MAP = {
    249: "CURRENT",          // Quality Pack
    49: "CURRENT",           // FML Font Pack
    99: "EDITING_BUNDLE"     // Editing Bundle
};

function hash(value) {
    if (!value) return null;

    return crypto
        .createHash("sha256")
        .update(
            value
                .trim()
                .toLowerCase()
        )
        .digest("hex");
}

async function sendPurchaseEvent(payment) {

    if (!payment.paymentId) {
        throw new Error(
            "Payment ID is missing."
        );
    }

    const value = Number(
        payment.amount
    );

    if (!value || value <= 0) {
        throw new Error(
            "Invalid purchase amount."
        );
    }

    /*
     * Select Meta dataset based on product.
     *
     * ₹249 → Current dataset
     * ₹49  → Current dataset
     * ₹99  → Editing Bundle dataset
     */
    const datasetName =
        PRODUCT_META_MAP[value];

    if (!datasetName) {
        throw new Error(
            `No Meta configuration found for ₹${value}`
        );
    }

    const config =
        META_CONFIG[datasetName];

    if (!config) {
        throw new Error(
            `Meta configuration missing for ${datasetName}`
        );
    }

    if (!config.pixelId) {
        throw new Error(
            `Meta Pixel/Dataset ID missing for ${datasetName}`
        );
    }

    if (!config.accessToken) {
        throw new Error(
            `Meta access token missing for ${datasetName}`
        );
    }

    const userData = {};

    if (payment.email) {
        userData.em = [
            hash(payment.email)
        ];
    }

    if (payment.phone) {
        userData.ph = [
            hash(payment.phone)
        ];
    }

    const event = {
        event_name: "Purchase",

        event_time:
            Math.floor(
                Date.now() / 1000
            ),

        /*
         * Razorpay Payment ID makes the event
         * idempotent and prevents duplicate
         * Purchase events when the same
         * payment is processed again.
         */
        event_id:
            payment.paymentId,

        action_source: "website",

        user_data: userData,

        custom_data: {
            value: value,

            currency:
                payment.currency || "INR"
        }
    };

    const url =
        `https://graph.facebook.com/` +
        `${META_API_VERSION}/` +
        `${config.pixelId}/events`;

    try {

        const response =
            await axios.post(
                url,
                {
                    data: [event]
                },
                {
                    params: {
                        access_token:
                            config.accessToken
                    },

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        console.log(
            "======================================"
        );

        console.log(
            "Meta Purchase Event Sent"
        );

        console.log(
            `Product Amount : ₹${value}`
        );

        console.log(
            `Meta Dataset   : ${datasetName}`
        );

        console.log(
            `Dataset ID     : ${config.pixelId}`
        );

        console.log(
            `Payment ID     : ${payment.paymentId}`
        );

        console.log(
            `Currency       : ${payment.currency || "INR"}`
        );

        console.log(
            `Events Received: ${response.data.events_received}`
        );

        console.log(
            "======================================"
        );

        return response.data;

    } catch (error) {

        console.error(
            "======================================"
        );

        console.error(
            "Meta Purchase Event Error"
        );

        console.error(
            `Product Amount : ₹${value}`
        );

        console.error(
            `Meta Dataset   : ${datasetName}`
        );

        console.error(
            `Dataset ID     : ${config.pixelId}`
        );

        console.error(
            "Error:",
            error.response?.data ||
            error.message
        );

        console.error(
            "======================================"
        );

        throw error;
    }
}

module.exports = {
    sendPurchaseEvent
};