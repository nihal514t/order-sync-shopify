const axios = require("axios");
const crypto = require("crypto");

const META_PIXEL_ID = process.env.META_PIXEL_ID;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_API_VERSION =
    process.env.META_API_VERSION || "v23.0";

function hash(value) {
    if (!value) return null;

    return crypto
        .createHash("sha256")
        .update(value.trim().toLowerCase())
        .digest("hex");
}

async function sendPurchaseEvent(payment) {
    if (!META_PIXEL_ID) {
        throw new Error("META_PIXEL_ID is missing.");
    }

    if (!META_ACCESS_TOKEN) {
        throw new Error("META_ACCESS_TOKEN is missing.");
    }

    if (!payment.paymentId) {
        throw new Error("Payment ID is missing.");
    }

    const value = Number(payment.amount);

    if (!value || value <= 0) {
        throw new Error("Invalid purchase amount.");
    }

    const userData = {};

    if (payment.email) {
        userData.em = [hash(payment.email)];
    }

    if (payment.phone) {
        userData.ph = [hash(payment.phone)];
    }

    const event = {
        event_name: "Purchase",

        event_time:
            Math.floor(Date.now() / 1000),

        event_id:
            payment.paymentId,

        action_source: "website",

        user_data: userData,

        custom_data: {
            value,
            currency:
                payment.currency || "INR"
        }
    };

    const url =
        `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events`;

    const response = await axios.post(
        url,
        {
            data: [event]
        },
        {
            params: {
                access_token:
                    META_ACCESS_TOKEN
            },

            headers: {
                "Content-Type":
                    "application/json"
            }
        }
    );

    console.log("======================================");
    console.log("Meta Purchase Event Sent");
    console.log(
        `Payment ID : ${payment.paymentId}`
    );
    console.log(
        `Amount     : ₹${value}`
    );
    console.log(
        `Currency   : ${payment.currency || "INR"}`
    );
    console.log(
        `Events Received : ${response.data.events_received}`
    );
    console.log("======================================");

    return response.data;
}

module.exports = {
    sendPurchaseEvent
};