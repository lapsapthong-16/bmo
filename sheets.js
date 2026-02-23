const { google } = require("googleapis");

let sheetsClient = null;

/**
 * Get an authenticated Google Sheets client (cached).
 * Reads the service account key from GOOGLE_SERVICE_ACCOUNT_KEY env var (base64-encoded JSON).
 */
async function getSheetsClient() {
    if (sheetsClient) return sheetsClient;

    const keyJson = JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, "base64").toString()
    );

    const auth = new google.auth.GoogleAuth({
        credentials: keyJson,
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
