const axios = require("axios");
const { getAccessToken } = require("./auth");

const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP;
const SHOPIFY_API_VERSION =
    process.env.SHOPIFY_API_VERSION || "2025-10";

const SHOPIFY_VARIANT_ID = Number(process.env.SHOPIFY_VARIANT_ID);

async function api() {
    const token = await getAccessToken();

    return axios.create({
        baseURL: `https://${SHOPIFY_SHOP}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}`,
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token
        }
    });
}

function validateConfig() {
    if (!SHOPIFY_SHOP)
        throw new Error("SHOPIFY_SHOP is missing.");

    if (!process.env.SHOPIFY_CLIENT_ID)
        throw new Error("SHOPIFY_CLIENT_ID is missing.");

    if (!process.env.SHOPIFY_CLIENT_SECRET)
        throw new Error("SHOPIFY_CLIENT_SECRET is missing.");

    if (!SHOPIFY_VARIANT_ID)
        throw new Error("SHOPIFY_VARIANT_ID is missing.");
}

async function findCustomerByEmail(email) {
    const client = await api();

    const response = await client.get("/customers/search.json", {
        params: {
            query: `email:${email}`
        }
    });

    if (response.data.customers.length > 0) {
        return response.data.customers[0];
    }

    return null;
}

async function createCustomer(customer) {
    const client = await api();

    const response = await client.post("/customers.json", {
        customer: {
            first_name: customer.name,
            email: customer.email,
            phone: customer.phone,
            verified_email: true,
            tags: "Razorpay"
        }
    });

    console.log(
        `Customer created: ${response.data.customer.email}`
    );

    return response.data.customer;
}

async function getOrCreateCustomer(customer) {
    const existing = await findCustomerByEmail(customer.email);

    if (existing) {
        console.log(
            `Customer already exists: ${existing.email}`
        );
        return existing;
    }

    return createCustomer(customer);
}

async function findOrderByPaymentId(paymentId) {
    const client = await api();

    const response = await client.get("/orders.json", {
        params: {
            status: "any",
            limit: 250
        }
    });

    const order = response.data.orders.find(order => {
        if (!order.note_attributes) return false;

        return order.note_attributes.some(attribute =>
            attribute.name === "Razorpay Payment ID" &&
            attribute.value === paymentId
        );
    });

    return order || null;
}

async function createOrder(customer, shopifyCustomerId) {
    const client = await api();

    const response = await client.post("/orders.json", {
        order: {
            customer: {
                id: shopifyCustomerId
            },

            financial_status: "paid",

            currency: "INR",

            email: customer.email,

            phone: customer.phone,

            tags: "Razorpay, Digital Product",

            note: `Paid via Razorpay\nPayment ID: ${customer.paymentId}`,

            note_attributes: [
                {
                    name: "Razorpay Payment ID",
                    value: customer.paymentId
                },
                {
                    name: "Razorpay Order ID",
                    value: customer.orderId || ""
                }
            ],

            send_receipt: true,

            send_fulfillment_receipt: false,

            line_items: [
                {
                    variant_id: SHOPIFY_VARIANT_ID,
                    quantity: 1
                }
            ]
        }
    });

    return response.data.order;
}

async function createShopifyOrder(customer) {
    validateConfig();

    if (!customer.email)
        throw new Error("Customer email is required.");

    if (!customer.paymentId)
        throw new Error("Payment ID is required.");

    console.log("--------------------------------");
    console.log("Processing Shopify Order");
    console.log("--------------------------------");
    console.log(`Email      : ${customer.email}`);
    console.log(`Payment ID : ${customer.paymentId}`);

    const existingOrder = await findOrderByPaymentId(
        customer.paymentId
    );

    if (existingOrder) {
        console.log(
            `Duplicate webhook ignored. Shopify Order #${existingOrder.order_number}`
        );

        return existingOrder;
    }

    const shopifyCustomer = await getOrCreateCustomer(customer);

    const order = await createOrder(
        customer,
        shopifyCustomer.id
    );

    console.log(
        `Shopify Order Created (#${order.order_number})`
    );

    return order;
}

module.exports = createShopifyOrder;