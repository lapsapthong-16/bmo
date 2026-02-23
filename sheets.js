const { google } = require("googleapis");

let sheetsClient = null;

const CATEGORIES = [
    "Food",
    "Transport",
    "Groceries",
    "Shopping",
    "Entertainment",
    "Bills",
    "Health",
    "Errand",
    "Others",
];

/**
 * Get an authenticated Google Sheets client (cached within the function invocation).
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
 * Get the sheetId (numeric) for "Sheet1".
 */
async function getSheetId(sheets, spreadsheetId) {
    const res = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: "sheets.properties",
    });
    const sheet = res.data.sheets.find(
        (s) => s.properties.title === "Sheet1"
    );
    return sheet ? sheet.properties.sheetId : 0;
}

/**
 * Ensure the category column has dropdown data validation.
 */
async function ensureCategoryDropdown(sheets, spreadsheetId, sheetId) {
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [
                {
                    setDataValidation: {
                        range: {
                            sheetId: sheetId,
                            startRowIndex: 1,
                            endRowIndex: 1000,
                            startColumnIndex: 2,
                            endColumnIndex: 3,
                        },
                        rule: {
                            condition: {
                                type: "ONE_OF_LIST",
                                values: CATEGORIES.map((c) => ({ userEnteredValue: c })),
                            },
                            showCustomUi: true,
                            strict: false,
                        },
                    },
                },
            ],
        },
    });
}

/**
 * Append an expense row to the Google Sheet.
 * @param {{ date: string, name: string, category: string, amount: number }} expense
 */
async function appendExpense({ date, name, category, amount }) {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Append the row
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Sheet1!A:D",
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [[date, name, category, amount]],
        },
    });

    // Apply dropdown validation (idempotent, fast)
    try {
        const sheetId = await getSheetId(sheets, spreadsheetId);
        await ensureCategoryDropdown(sheets, spreadsheetId, sheetId);
    } catch (err) {
        console.warn("⚠️ Could not apply dropdown validation:", err.message);
    }
}

module.exports = { appendExpense };
