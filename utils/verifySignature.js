const crypto = require("crypto");

/**
 * Verify Razorpay Webhook Signature
 * @param {Buffer} rawBody
 * @param {string} signature
 * @returns {boolean}
 */

function verifySignature(rawBody, signature) {

    const generatedSignature = crypto
        .createHmac(
            "sha256",
            process.env.RAZORPAY_WEBHOOK_SECRET
        )
        .update(rawBody)
        .digest("hex");

    return crypto.timingSafeEqual(
        Buffer.from(generatedSignature),
        Buffer.from(signature)
    );
}

module.exports = verifySignature;