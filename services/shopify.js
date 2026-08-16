const axios = require("axios");
const { getAccessToken } = require("./auth");

const {
    appendToGoogleSheet
} = require("./googleSheetsService");


const SHOPIFY_API_VERSION =
    process.env.SHOPIFY_API_VERSION || "2025-10";


/*
 * =========================================================
 * STORES
 * =========================================================
 */

const STORES = {

    STORE_1: {
        shop: process.env.SHOPIFY_SHOP
    },

    STORE_2: {
        shop: process.env.SHOPIFY_STORE_2_SHOP
    }

};


/*
 * =========================================================
 * PRODUCT → STORE MAPPING
 * =========================================================
 */

const PRODUCT_MAP = {

    249: {
        store: "STORE_1",

        variantId:
            Number(
                process.env.QUALITY_PACK_VARIANT_ID
            ),

        productName:
            "Quality Pack"
    },


    49: {
        store: "STORE_1",

        variantId:
            Number(
                process.env.FML_FONT_PACK_VARIANT_ID
            ),

        productName:
            "FML Font Pack"
    },


    99: {
        store: "STORE_2",

        variantId:
            Number(
                process.env.EDITING_BUNDLE_VARIANT_ID
            ),

        productName:
            "Editing Bundle"
    }

};


/*
 * =========================================================
 * SHOPIFY API CLIENT
 * =========================================================
 */

async function api(storeName) {

    const store =
        STORES[storeName];


    if (!store) {

        throw new Error(
            `Unknown Shopify store: ${storeName}`
        );

    }


    if (!store.shop) {

        throw new Error(
            `Shopify shop is missing for ${storeName}`
        );

    }


    const token =
        await getAccessToken(
            storeName
        );


    return axios.create({

        baseURL:
            `https://${store.shop}.myshopify.com` +
            `/admin/api/${SHOPIFY_API_VERSION}`,

        headers: {

            "Content-Type":
                "application/json",

            "X-Shopify-Access-Token":
                token

        }

    });

}


/*
 * =========================================================
 * VALIDATE CONFIG
 * =========================================================
 */

function validateConfig() {

    if (!process.env.SHOPIFY_SHOP) {

        throw new Error(
            "SHOPIFY_SHOP is missing."
        );

    }


    if (!process.env.SHOPIFY_CLIENT_ID) {

        throw new Error(
            "SHOPIFY_CLIENT_ID is missing."
        );

    }


    if (!process.env.SHOPIFY_CLIENT_SECRET) {

        throw new Error(
            "SHOPIFY_CLIENT_SECRET is missing."
        );

    }


    if (!process.env.SHOPIFY_STORE_2_SHOP) {

        throw new Error(
            "SHOPIFY_STORE_2_SHOP is missing."
        );

    }


    if (!process.env.SHOPIFY_STORE_2_CLIENT_ID) {

        throw new Error(
            "SHOPIFY_STORE_2_CLIENT_ID is missing."
        );

    }


    if (!process.env.SHOPIFY_STORE_2_CLIENT_SECRET) {

        throw new Error(
            "SHOPIFY_STORE_2_CLIENT_SECRET is missing."
        );

    }


    if (!process.env.QUALITY_PACK_VARIANT_ID) {

        throw new Error(
            "QUALITY_PACK_VARIANT_ID is missing."
        );

    }


    if (!process.env.FML_FONT_PACK_VARIANT_ID) {

        throw new Error(
            "FML_FONT_PACK_VARIANT_ID is missing."
        );

    }


    if (!process.env.EDITING_BUNDLE_VARIANT_ID) {

        throw new Error(
            "EDITING_BUNDLE_VARIANT_ID is missing."
        );

    }

}


/*
 * =========================================================
 * FIND CUSTOMER BY EMAIL
 * =========================================================
 */

async function findCustomerByEmail(
    email,
    storeName
) {

    if (!email) {
        return null;
    }


    const client =
        await api(storeName);


    const response =
        await client.get(
            "/customers/search.json",
            {
                params: {
                    query:
                        `email:${email}`
                }
            }
        );


    if (
        response.data.customers &&
        response.data.customers.length > 0
    ) {

        return response.data.customers[0];

    }


    return null;

}


/*
 * =========================================================
 * FIND CUSTOMER BY PHONE
 * =========================================================
 */

async function findCustomerByPhone(
    phone,
    storeName
) {

    if (!phone) {
        return null;
    }


    const client =
        await api(storeName);


    const response =
        await client.get(
            "/customers/search.json",
            {
                params: {
                    query:
                        `phone:${phone}`
                }
            }
        );


    if (
        response.data.customers &&
        response.data.customers.length > 0
    ) {

        return response.data.customers[0];

    }


    return null;

}


/*
 * =========================================================
 * CREATE CUSTOMER
 * =========================================================
 */

async function createCustomer(
    customer,
    storeName
) {

    const client =
        await api(storeName);


    const customerData = {

        first_name:
            customer.name || "",

        email:
            customer.email,

        verified_email:
            true,

        tags:
            "Razorpay"

    };


    /*
     * Only send phone when one actually exists.
     */

    if (customer.phone) {

        customerData.phone =
            customer.phone;

    }


    const response =
        await client.post(
            "/customers.json",
            {
                customer:
                    customerData
            }
        );


    console.log(
        `Customer created in ${storeName}: ` +
        `${response.data.customer.email}`
    );


    return response.data.customer;

}


/*
 * =========================================================
 * GET OR CREATE CUSTOMER
 *
 * IMPORTANT:
 *
 * 1. Search email.
 * 2. If not found, search phone.
 * 3. Only create a customer if neither exists.
 *
 * This prevents:
 *
 * phone: [ 'has already been taken' ]
 *
 * =========================================================
 */

async function getOrCreateCustomer(
    customer,
    storeName
) {

    /*
     * -----------------------------------------------------
     * STEP 1: EMAIL
     * -----------------------------------------------------
     */

    const customerByEmail =
        await findCustomerByEmail(
            customer.email,
            storeName
        );


    if (customerByEmail) {

        console.log(
            `Customer found by email in ` +
            `${storeName}: ` +
            `${customerByEmail.email}`
        );


        return customerByEmail;

    }


    /*
     * -----------------------------------------------------
     * STEP 2: PHONE
     * -----------------------------------------------------
     */

    if (customer.phone) {

        const customerByPhone =
            await findCustomerByPhone(
                customer.phone,
                storeName
            );


        if (customerByPhone) {

            console.log(
                `Customer found by phone in ` +
                `${storeName}: ` +
                `${customerByPhone.email || "No email"}`
            );


            return customerByPhone;

        }

    }


    /*
     * -----------------------------------------------------
     * STEP 3: CREATE NEW CUSTOMER
     * -----------------------------------------------------
     */

    console.log(
        `No existing customer found in ` +
        `${storeName}. Creating new customer.`
    );


    return createCustomer(
        customer,
        storeName
    );

}


/*
 * =========================================================
 * FIND ORDER BY RAZORPAY PAYMENT ID
 * =========================================================
 */

async function findOrderByPaymentId(
    paymentId,
    storeName
) {

    const client =
        await api(storeName);


    const response =
        await client.get(
            "/orders.json",
            {
                params: {

                    status:
                        "any",

                    limit:
                        250

                }
            }
        );


    const orders =
        response.data.orders || [];


    const order =
        orders.find(
            order => {

                if (
                    !order.note_attributes
                ) {

                    return false;

                }


                return order.note_attributes.some(
                    attribute =>

                        attribute.name ===
                            "Razorpay Payment ID" &&

                        attribute.value ===
                            paymentId
                );

            }
        );


    return order || null;

}


/*
 * =========================================================
 * CREATE SHOPIFY ORDER
 * =========================================================
 */

async function createOrder(
    customer,
    shopifyCustomerId,
    variantId,
    storeName,
    productName
) {

    const client =
        await api(storeName);


    const response =
        await client.post(
            "/orders.json",
            {

                order: {

                    customer: {

                        id:
                            shopifyCustomerId

                    },


                    financial_status:
                        "paid",


                    currency:
                        customer.currency ||
                        "INR",


                    email:
                        customer.email,


                    phone:
                        customer.phone || "",


                    tags:
                        `Razorpay, Digital Product, ${productName}`,


                    note:
                        `Paid via Razorpay\n` +
                        `Payment ID: ${customer.paymentId}`,


                    note_attributes: [

                        {

                            name:
                                "Razorpay Payment ID",

                            value:
                                customer.paymentId

                        },

                        {

                            name:
                                "Razorpay Order ID",

                            value:
                                customer.orderId || ""

                        },

                        {

                            name:
                                "Product",

                            value:
                                productName

                        }

                    ],


                    send_receipt:
                        true,


                    send_fulfillment_receipt:
                        false,


                    line_items: [

                        {

                            variant_id:
                                variantId,

                            quantity:
                                1

                        }

                    ]

                }

            }
        );


    return response.data.order;

}


/*
 * =========================================================
 * CREATE SHOPIFY ORDER
 * =========================================================
 */

async function createShopifyOrder(
    customer
) {

    validateConfig();


    /*
     * -----------------------------------------------------
     * BASIC VALIDATION
     * -----------------------------------------------------
     */

    if (!customer.email) {

        throw new Error(
            "Customer email is required."
        );

    }


    if (!customer.paymentId) {

        throw new Error(
            "Payment ID is required."
        );

    }


    if (
        customer.amount === undefined ||
        customer.amount === null
    ) {

        throw new Error(
            "Payment amount is required."
        );

    }


    const amount =
        Number(
            customer.amount
        );


    /*
     * -----------------------------------------------------
     * PRODUCT LOOKUP
     * -----------------------------------------------------
     */

    const product =
        PRODUCT_MAP[amount];


    if (!product) {

        throw new Error(
            `No Shopify product configured for ₹${amount}`
        );

    }


    const storeName =
        product.store;


    /*
     * -----------------------------------------------------
     * LOG
     * -----------------------------------------------------
     */

    console.log(
        "--------------------------------"
    );

    console.log(
        "Processing Shopify Order"
    );

    console.log(
        "--------------------------------"
    );

    console.log(
        `Product    : ${product.productName}`
    );

    console.log(
        `Amount     : ₹${amount}`
    );

    console.log(
        `Store      : ${storeName}`
    );

    console.log(
        `Email      : ${customer.email}`
    );

    console.log(
        `Phone      : ${customer.phone || "Not provided"}`
    );

    console.log(
        `Payment ID : ${customer.paymentId}`
    );


    /*
     * -----------------------------------------------------
     * DUPLICATE PAYMENT CHECK
     * -----------------------------------------------------
     */

    const existingOrder =
        await findOrderByPaymentId(
            customer.paymentId,
            storeName
        );


    if (existingOrder) {

        console.log(
            `Duplicate webhook ignored. ` +
            `${storeName} Shopify Order #` +
            `${existingOrder.order_number}`
        );


        return existingOrder;

    }


    /*
     * -----------------------------------------------------
     * VARIANT VALIDATION
     * -----------------------------------------------------
     */

    if (!product.variantId) {

        throw new Error(
            `Variant ID missing for ${product.productName}`
        );

    }


    /*
     * -----------------------------------------------------
     * CUSTOMER
     * -----------------------------------------------------
     */

    const shopifyCustomer =
        await getOrCreateCustomer(
            customer,
            storeName
        );


    /*
     * -----------------------------------------------------
     * CREATE ORDER
     * -----------------------------------------------------
     */

    const order =
        await createOrder(
            customer,
            shopifyCustomer.id,
            product.variantId,
            storeName,
            product.productName
        );


    /*
     * -----------------------------------------------------
     * ORDER LOG
     * -----------------------------------------------------
     */

    console.log(
        "Shopify Order Created"
    );

    console.log(
        `Store      : ${storeName}`
    );

    console.log(
        `Product    : ${product.productName}`
    );

    console.log(
        `Order      : #${order.order_number}`
    );

    console.log(
        `Order ID   : ${order.id}`
    );


    /*
     * -----------------------------------------------------
     * GOOGLE SHEET
     * -----------------------------------------------------
     */

    await appendToGoogleSheet(
        order
    );


    return order;

}


module.exports =
    createShopifyOrder;