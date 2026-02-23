/**
 * One-time script: Register the Telegram webhook URL.
 *
 * Usage:
 *   node scripts/set-webhook.js https://your-app.vercel.app
 *
 * This tells Telegram to send all bot updates to:
 *   https://your-app.vercel.app/api/webhook
 */

require("dotenv").config();

const VERCEL_URL = process.argv[2];

if (!VERCEL_URL) {
    console.error("❌ Usage: node scripts/set-webhook.js https://your-app.vercel.app");
    process.exit(1);
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN not found. Set it in .env or as an environment variable.");
    process.exit(1);
}

const webhookUrl = `${VERCEL_URL.replace(/\/$/, "")}/api/webhook`;

async function setWebhook() {
    console.log(`\n🔗 Setting webhook to: ${webhookUrl}\n`);

    const res = await fetch(
        `https://api.telegram.org/bot${TOKEN}/setWebhook`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: webhookUrl,
                allowed_updates: ["message"],
            }),
        }
    );

    const data = await res.json();

    if (data.ok) {
        console.log("✅ Webhook set successfully!");
        console.log(`   Telegram will POST updates to: ${webhookUrl}`);
    } else {
        console.error("❌ Failed to set webhook:", data);
    }
}

setWebhook();
