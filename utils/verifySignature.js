const crypto = require("crypto");

function verifySignature(rawBody, signature) {

    const generatedSignature = crypto
        .createHmac(
            "sha256",
            process.env.RAZORPAY_WEBHOOK_SECRET
        )
        .update(rawBody)
        .digest("hex");

    // Prevent timingSafeEqual from throwing
    if (
        generatedSignature.length !== signature.length
    ) {
        return false;
    }

    return crypto.timingSafeEqual(
        Buffer.from(generatedSignature, "utf8"),
        Buffer.from(signature, "utf8")
    );
}

module.exports = verifySignature;