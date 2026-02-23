const { parseExpense } = require("../llm");
const { appendExpense } = require("../sheets");

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * Send a message to a Telegram chat via HTTP API.
 */
async function sendTelegramMessage(chatId, text) {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: "Markdown",
        }),
    });
}

/**
 * Vercel serverless handler — receives Telegram webhook POSTs.
 */
module.exports = async function handler(req, res) {
    // Only accept POST
    if (req.method !== "POST") {
        return res.status(200).json({ ok: true, method: req.method });
    }

    try {
        const update = req.body;
        const message = update?.message;

        // Ignore non-text messages
        if (!message?.text) {
            return res.status(200).json({ ok: true });
        }

        const chatId = message.chat.id;
        const text = message.text;

        // Handle /start command
        if (text.startsWith("/start")) {
            await sendTelegramMessage(
                chatId,
                "👋 *Welcome to Expense Tracker!*\n\n" +
                "Send me your expenses in any format, for example:\n" +
                "• `12.9 chicken rice`\n" +
                "• `45 grab home`\n" +
                "• `netflix 15.90`\n\n" +
                "I'll categorize them and log them to your Google Sheet automatically."
            );
            return res.status(200).json({ ok: true });
        }

        // Skip other commands
        if (text.startsWith("/")) {
            return res.status(200).json({ ok: true });
        }

        // 1. Parse with LLM
        const expense = await parseExpense(text);

        // 2. Build the date string (use message timestamp from Telegram)
        const msgDate = new Date(message.date * 1000);
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
        await sendTelegramMessage(
            chatId,
            `✅ *${expense.name}* (${expense.category}) — $${amountFormatted}`
        );
    } catch (err) {
        console.error("Webhook error:", err);
        // Try to notify user of error if possible
        try {
            const chatId = req.body?.message?.chat?.id;
            const text = req.body?.message?.text;
            if (chatId) {
                await sendTelegramMessage(
                    chatId,
                    `❌ Failed to process: _${text}_\n\nError: ${err.message}`
                );
            }
        } catch (_) {
            // Ignore notification errors
        }
    }

    // Always return 200 so Telegram doesn't retry
    return res.status(200).json({ ok: true });
};
