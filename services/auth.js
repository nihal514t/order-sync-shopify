const axios = require("axios");

const SHOP = process.env.SHOPIFY_SHOP;
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

let token = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
    if (token && Date.now() < tokenExpiresAt) {
        return token;
    }

    try {
        console.log("Refreshing Shopify access token...");

        const response = await axios.post(
            `https://${SHOP}.myshopify.com/admin/oauth/access_token`,
            new URLSearchParams({
                grant_type: "client_credentials",
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        );

        console.log("Token endpoint response:");
        console.log(response.data);

        token = response.data.access_token;

        tokenExpiresAt =
            Date.now() + ((response.data.expires_in || 3600) - 60) * 1000;

        console.log("✅ Shopify token refreshed");

        return token;

    } catch (error) {

        console.error("========== SHOPIFY AUTH ERROR ==========");

        console.error("Message:", error.message);

        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Response:", JSON.stringify(error.response.data, null, 2));
        }

        console.error("========================================");

        throw error;
    }
}

module.exports = {
    getAccessToken
};