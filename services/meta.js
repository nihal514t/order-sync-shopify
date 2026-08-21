const bizSdk = require("facebook-nodejs-business-sdk");

const {
    ServerEvent,
    EventRequest,
    UserData,
    CustomData,
    Preference
} = bizSdk;


/*
 * =========================================================
 * META CONFIGURATION
 * =========================================================
 */

const META_CONFIG = {

    QUALITY_PACK: {
        pixelId: process.env.META_QUALITY_PIXEL_ID,
        accessToken: process.env.META_QUALITY_ACCESS_TOKEN
    },

    FML_FONT_PACK: {
        pixelId: process.env.META_FML_PIXEL_ID,
        accessToken: process.env.META_FML_ACCESS_TOKEN
    },

    EDITING_BUNDLE: {
        pixelId: process.env.META_EDITING_PIXEL_ID,
        accessToken: process.env.META_EDITING_ACCESS_TOKEN
    }

};


/*
 * =========================================================
 * PRODUCT → META DATASET
 * =========================================================
 *
 * ₹249 → Current dataset
 * ₹49  → Current dataset
 * ₹99  → Editing Bundle dataset
 *
 */

const PRODUCT_META_MAP = {

    249: "QUALITY_PACK",

    49: "FML_FONT_PACK",

    99: "EDITING_BUNDLE"

};

/*
 * =========================================================
 * SEND PURCHASE EVENT
 * =========================================================
 */

async function sendPurchaseEvent(payment) {

    /*
     * -----------------------------------------------------
     * Validate payment
     * -----------------------------------------------------
     */

    if (!payment) {

        throw new Error(
            "Payment object is missing."
        );

    }


    if (!payment.paymentId) {

        throw new Error(
            "Payment ID is missing."
        );

    }


    const value =
        Number(payment.amount);


    if (!value || value <= 0) {

        throw new Error(
            "Invalid purchase amount."
        );

    }


    /*
     * -----------------------------------------------------
     * Select Meta dataset
     * -----------------------------------------------------
     */

    const datasetName =
        PRODUCT_META_MAP[value];


    if (!datasetName) {

        throw new Error(
            `No Meta configuration found for ₹${value}`
        );

    }


    const config =
        META_CONFIG[datasetName];


    if (!config) {

        throw new Error(
            `Meta configuration missing for ${datasetName}`
        );

    }


    if (!config.pixelId) {

        throw new Error(
            `Meta Pixel/Dataset ID missing for ${datasetName}`
        );

    }


    if (!config.accessToken) {

        throw new Error(
            `Meta access token missing for ${datasetName}`
        );

    }


    /*
     * -----------------------------------------------------
     * User Data
     *
     * IMPORTANT:
     *
     * Do NOT manually SHA-256 hash email/phone here.
     *
     * The current Node.js Business SDK / Parameter Builder
     * handles normalization and hashing.
     * -----------------------------------------------------
     */

    const userData =
        new UserData();


    if (payment.email) {

        userData.setEmail(
            payment.email
        );

    }


    if (payment.phone) {

        userData.setPhone(
            payment.phone
        );

    }


    /*
     * -----------------------------------------------------
     * Custom Data
     * -----------------------------------------------------
     */

    const customData =
        new CustomData()
            .setValue(value)
            .setCurrency(
                payment.currency || "INR"
            );


    /*
     * -----------------------------------------------------
     * Server Event
     * -----------------------------------------------------
     */

    const serverEvent =
        new ServerEvent()

            .setEventName(
                "Purchase"
            )

            .setEventTime(
                Math.floor(
                    Date.now() / 1000
                )
            )

            .setEventId(
                payment.paymentId
            )

            .setActionSource(
                "website"
            )

            .setUserData(
                userData
            )

            .setCustomData(
                customData
            );


    /*
     * -----------------------------------------------------
     * REQUEST CONTEXT
     *
     * This is what allows Meta's Parameter Builder
     * to obtain:
     *
     * fbc
     * fbp
     * client_ip_address
     * event_source_url
     * referrer_url
     *
     * The request must come from your original web request.
     * -----------------------------------------------------
     */

    if (payment.request) {

        serverEvent.setRequestContext(

            payment.request,

            new Preference(
                true,  // fbc
                true,  // fbp
                true,  // client_ip_address
                true,  // referrer_url
                true   // event_source_url
            )

        );

    }


    /*
     * -----------------------------------------------------
     * SEND TO META
     * -----------------------------------------------------
     */

    try {

        const eventRequest =
            new EventRequest(
                config.accessToken,
                config.pixelId
            );


        eventRequest.setEvents([
            serverEvent
        ]);


        const response =
            await eventRequest.execute();

        console.log("Meta API Response:",JSON.stringify(response, null, 2));


        /*
         * -------------------------------------------------
         * LOGGING
         * -------------------------------------------------
         */

        console.log(
            "======================================"
        );

        console.log(
            "Meta Purchase Event Sent"
        );

        console.log(
            `Product Amount : ₹${value}`
        );

        console.log(
            `Meta Dataset   : ${datasetName}`
        );

        console.log(
            `Dataset ID     : ${config.pixelId}`
        );

        console.log(
            `Payment ID     : ${payment.paymentId}`
        );

        console.log(
            `Currency       : ${payment.currency || "INR"}`
        );

        console.log(
            "Parameter Builder:",
            payment.request
                ? "ENABLED"
                : "NO REQUEST CONTEXT"
        );

        console.log(
            "======================================"
        );


        return response;


    } catch (error) {

        console.error(
            "======================================"
        );

        console.error(
            "Meta Purchase Event Error"
        );

        console.error(
            `Product Amount : ₹${value}`
        );

        console.error(
            `Meta Dataset   : ${datasetName}`
        );

        console.error(
            `Dataset ID     : ${config.pixelId}`
        );

        console.error(
            `Payment ID     : ${payment.paymentId}`
        );

        console.error(
            "Error:",
            error.response?.data ||
            error.message ||
            error
        );

        console.error(
            "======================================"
        );

        throw error;

    }

}


module.exports = {
    sendPurchaseEvent
};