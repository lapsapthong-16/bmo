const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expense parser. The user will send a short message describing a purchase or expense.

Extract the following fields and return ONLY valid JSON (no markdown, no explanation):
{
  "name": "Title Case item name",
  "category": "one of the categories below",
  "amount": number
}

Categories (pick the EXACT string, closest match):
- Food (meals, drinks, snacks, restaurants, cafes, hawker, food delivery)
- Transport (grab, taxi, mrt, bus, fuel, parking, toll, e-scooter)
- Groceries (supermarket, fresh produce, household supplies from grocery stores)
- Shopping (clothes, shoes, electronics, online shopping, accessories)
- Entertainment (movies, games, streaming subscriptions, concerts, hobbies)
- Bills (electricity, water, phone, internet, insurance, rent)
- Health (clinic, medicine, dental, gym, supplements, optical)
- Errand (see special rules below)
- Others (anything that doesn't fit above)

ERRAND CATEGORY — IMPORTANT SENTIMENT RULES:
The "Errand" category is used ONLY when someone else is paying and the user needs to claim the money back.
- "under mommy", "paid by mommy", "mommy paying", "mommy's money", "claim from mom" → category = "Errand"
  (This means the user's mom asked them to buy it and will reimburse them.)
- "for mommy", "for mom", "buying for mom" → DO NOT use "Errand". Use the normal category (Food, Shopping, etc.)
  (This means the user is paying for it themselves as a gift/purchase for their mom.)
- The key distinction: "UNDER someone" or "PAID BY someone" = Errand. "FOR someone" = normal category.
- When categorising as Errand, strip the errand context from the item name (e.g. "12.9 chicken rice under mommy" → name: "Chicken Rice", category: "Errand")

Rules:
- The amount is usually the first number in the message, but could appear anywhere
- Title-case the item name (e.g. "chicken rice" → "Chicken Rice")
- If no amount is found, set amount to 0
- If the message is unclear, do your best guess
- ONLY return the JSON object, nothing else`;

/**
 * Parse an expense message using Groq LLM.
 * @param {string} text - The raw user message, e.g. "12.9 chicken rice"
 * @returns {Promise<{name: string, category: string, amount: number}>}
 */
async function parseExpense(text) {
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    model: "llama-3.1-8b-instant",
    temperature: 0.1,
    max_tokens: 150,
    response_format: { type: "json_object" },
  });

  const raw = chatCompletion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty response from LLM");
  }

  const parsed = JSON.parse(raw);

  // Validate required fields
  if (!parsed.name || parsed.amount === undefined) {
    throw new Error(`LLM returned incomplete data: ${raw}`);
  }

  return {
    name: parsed.name,
    category: parsed.category || "Others",
    amount: Number(parsed.amount),
  };
}

module.exports = { parseExpense };
