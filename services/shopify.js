const axios = require("axios");

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION =
    process.env.SHOPIFY_API_VERSION || "2025-10";

const SHOPIFY_VARIANT_ID = Number(process.env.SHOPIFY_VARIANT_ID);

const api = axios.create({
    baseURL: `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}`,
    headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN
    }
});

function validateConfig() {
    if (!SHOPIFY_STORE)
        throw new Error("SHOPIFY_STORE is missing.");

    if (!SHOPIFY_ACCESS_TOKEN)
        throw new Error("SHOPIFY_ACCESS_TOKEN is missing.");

    if (!SHOPIFY_VARIANT_ID)
        throw new Error("SHOPIFY_VARIANT_ID is missing.");
}

async function findCustomerByEmail(email) {
    const response = await api.get("/customers/search.json", {
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
    const response = await api.post("/customers.json", {
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
    const response = await api.get("/orders.json", {
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
    const response = await api.post("/orders.json", {
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

    const shopifyCustomer =
        await getOrCreateCustomer(customer);

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