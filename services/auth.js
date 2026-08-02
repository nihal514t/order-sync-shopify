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

    token = response.data.access_token;
    tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;

    console.log("✅ Shopify token refreshed");

    return token;
}

module.exports = {
    getAccessToken
};