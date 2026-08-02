const crypto = require("crypto");

/**
 * Verify Razorpay Webhook Signature
 *
 * @param {Buffer} rawBody
 * @param {string} signature
 * @returns {boolean}
 */
function verifySignature(rawBody, signature) {
    try {
        const generatedSignature = crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_WEBHOOK_SECRET
            )
            .update(rawBody)
            .digest("hex");

        return crypto.timingSafeEqual(
            Buffer.from(generatedSignature, "utf8"),
            Buffer.from(signature, "utf8")
        );
    } catch (error) {
        console.error("Signature Verification Error:", error.message);
        return false;
    }
}

module.exports = verifySignature;