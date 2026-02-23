/**
 * Helper script: Base64-encode your service-account-key.json
 * so you can paste the value into Vercel's environment variables.
 *
 * Usage:
 *   node scripts/encode-key.js
 *
 * Copy the output string and set it as GOOGLE_SERVICE_ACCOUNT_KEY in Vercel.
 */

const fs = require("fs");
const path = require("path");

const keyPath = path.join(__dirname, "..", "service-account-key.json");

if (!fs.existsSync(keyPath)) {
    console.error("❌ service-account-key.json not found in project root.");
    process.exit(1);
}

const keyJson = fs.readFileSync(keyPath, "utf-8");
const encoded = Buffer.from(keyJson).toString("base64");

console.log("\n📋 Copy the following value and set it as GOOGLE_SERVICE_ACCOUNT_KEY in Vercel:\n");
console.log(encoded);
console.log(`\n(${encoded.length} characters)\n`);
