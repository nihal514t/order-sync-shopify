const axios = require("axios");

const STORES = {
    STORE_1: {
        shop: process.env.SHOPIFY_SHOP,
        clientId: process.env.SHOPIFY_CLIENT_ID,
        clientSecret: process.env.SHOPIFY_CLIENT_SECRET
    },

    STORE_2: {
        shop: process.env.SHOPIFY_STORE_2_SHOP,
        clientId: process.env.SHOPIFY_STORE_2_CLIENT_ID,
        clientSecret: process.env.SHOPIFY_STORE_2_CLIENT_SECRET
    }
};

const tokenCache = {
    STORE_1: {
        token: null,
        expiresAt: 0
    },

    STORE_2: {
        token: null,
        expiresAt: 0
    }
};

async function getAccessToken(storeName = "STORE_1") {
    const store = STORES[storeName];

    if (!store) {
        throw new Error(
            `Unknown Shopify store: ${storeName}`
        );
    }

    if (!store.shop) {
        throw new Error(
            `${storeName}: Shopify shop is missing.`
        );
    }

    if (!store.clientId) {
        throw new Error(
            `${storeName}: Shopify client ID is missing.`
        );
    }

    if (!store.clientSecret) {
        throw new Error(
            `${storeName}: Shopify client secret is missing.`
        );
    }

    const cache = tokenCache[storeName];

    if (
        cache.token &&
        Date.now() < cache.expiresAt
    ) {
        return cache.token;
    }

    try {
        console.log(
            `Refreshing Shopify access token → ${storeName}`
        );

        const response = await axios.post(
            `https://${store.shop}.myshopify.com/admin/oauth/access_token`,
            new URLSearchParams({
                grant_type: "client_credentials",
                client_id: store.clientId,
                client_secret: store.clientSecret
            }),
            {
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                }
            }
        );

        cache.token = response.data.access_token;

        cache.expiresAt =
            Date.now() +
            ((response.data.expires_in || 86400) - 60) * 1000;

        console.log(
            `Shopify token refreshed → ${storeName}`
        );

        return cache.token;

    } catch (error) {
        console.error(
            `========== ${storeName} SHOPIFY AUTH ERROR ==========`
        );

        console.error(
            "Message:",
            error.message
        );

        if (error.response) {
            console.error(
                "Status:",
                error.response.status
            );

            console.error(
                "Response:",
                JSON.stringify(
                    error.response.data,
                    null,
                    2
                )
            );
        }

        console.error(
            "=========================================="
        );

        throw error;
    }
}

module.exports = {
    getAccessToken
};