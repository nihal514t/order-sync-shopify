const { google } = require("googleapis");

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

// Fix escaped newlines in private key
credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
        "https://www.googleapis.com/auth/spreadsheets"
    ]
});

const sheets = google.sheets({
    version: "v4",
    auth
});

const PRODUCT_MAP = {
    249: {
        spreadsheetId: process.env.QUALITY_SPREADSHEET_ID,
        sheetName: "DAILY",
        value: 243.12
    },

    49: {
        spreadsheetId: process.env.FML_SPREADSHEET_ID,
        sheetName: "DAILY",
        value: 47.84
    }
};

async function appendToGoogleSheet(order) {
    try {

        const orderPrice = Number(order.current_total_price);

        const config = PRODUCT_MAP[orderPrice];

        if (!config) {
            throw new Error(
                `No Google Sheet mapping found for ₹${orderPrice}`
            );
        }

        // Format: dd/MM/yyyy HH:mm:ss
        const now = new Date();

        const date = now.toLocaleString("en-GB", {
            timeZone: "Asia/Kolkata",
            hour12: false
        });

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: config.spreadsheetId,
            range: `${config.sheetName}!A:B`,
            valueInputOption: "USER_ENTERED",
            insertDataOption: "INSERT_ROWS",
            requestBody: {
                values: [
                    [
                        date,
                        config.value
                    ]
                ]
            }
        });

        console.log("--------------------------------");
        console.log("Google Sheet Updated");
        console.log(`Amount      : ₹${orderPrice}`);
        console.log(`Value       : ${config.value}`);
        console.log(`Spreadsheet : ${config.spreadsheetId}`);
        console.log(`Updated     : ${response.data.updates.updatedRange}`);
        console.log("--------------------------------");

    } catch (error) {

        console.error("--------------------------------");
        console.error("Google Sheets Error");
        console.error(error.response?.data || error.message);
        console.error("--------------------------------");

        throw error;
    }
}

module.exports = {
    appendToGoogleSheet
};