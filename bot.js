require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");
const { parseExpense } = require("./llm");
const { appendExpense } = require("./sheets");

// --- Offset persistence ---
const OFFSET_FILE = path.join(__dirname, "last_offset.json");

function loadOffset() {
    try {
        const data = fs.readFileSync(OFFSET_FILE, "utf-8");
        const { offset } = JSON.parse(data);
        return offset || 0;
    } catch {
        return 0; // First run, start from beginning
    }
}

function saveOffset(offset) {
    fs.writeFileSync(OFFSET_FILE, JSON.stringify({ offset }), "utf-8");
}

// --- Bot setup ---
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not set in .env");
    process.exit(1);
}

const bot = new TelegramBot(token, {
    polling: {
        params: {
            offset: loadOffset(),
            timeout: 30,
        },
    },
});

console.log("🤖 Expense Tracker Bot is running...");

// Persist offset as updates come in
bot.on("polling_error", (err) => {
    console.error("Polling error:", err.message);
});

// --- /start command ---
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
        chatId,
        "👋 *Welcome to Expense Tracker!*\n\n" +
        "Send me your expenses in any format, for example:\n" +
        "• `12.9 chicken rice`\n" +
        "• `45 grab home`\n" +
        "• `netflix 15.90`\n\n" +
        "I'll categorize them and log them to your Google Sheet automatically.",
        { parse_mode: "Markdown" }
    );
    // Save offset so /start isn't replayed on restart
    saveOffset(msg.update_id + 1);
});

// --- Handle expense messages ---
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Skip commands and non-text messages
    if (!text || text.startsWith("/")) {
        return;
    }

    try {
        // 1. Parse with LLM
        const expense = await parseExpense(text);

        // 2. Build the date string (use message date from Telegram)
        const msgDate = new Date(msg.date * 1000);
        const dateStr = msgDate.toLocaleDateString("en-SG", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });

        // 3. Append to Google Sheets
        await appendExpense({
            date: dateStr,
            name: expense.name,
            category: expense.category,
            amount: expense.amount,
        });

        // 4. Confirm to user
        const amountFormatted = expense.amount.toFixed(2);
        bot.sendMessage(
            chatId,
            `✅ *${expense.name}* (${expense.category}) — $${amountFormatted}`,
            { parse_mode: "Markdown" }
        );
    } catch (err) {
        console.error("Error processing message:", err);
        bot.sendMessage(
            chatId,
            `❌ Failed to process: _${text}_\n\nError: ${err.message}`,
            { parse_mode: "Markdown" }
        );
    }

    // Save offset after processing
    saveOffset(msg.update_id + 1);
});

// --- Graceful shutdown ---
process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down...");
    bot.stopPolling();
    process.exit(0);
});

process.on("SIGTERM", () => {
    bot.stopPolling();
    process.exit(0);
});
