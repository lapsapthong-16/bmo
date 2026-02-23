const { google } = require("googleapis");
const path = require("path");

let sheetsClient = null;

/**
 * Get an authenticated Google Sheets client (cached).
 */
async function getSheetsClient() {
    if (sheetsClient) return sheetsClient;

    const keyPath = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH);
    const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    sheetsClient = google.sheets({ version: "v4", auth });
    return sheetsClient;
}

/**
 * Append an expense row to the Google Sheet.
 * @param {{ date: string, name: string, category: string, amount: number }} expense
 */
async function appendExpense({ date, name, category, amount }) {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Sheet1!A:D",
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [[date, name, category, amount]],
        },
    });
}

module.exports = { appendExpense };
