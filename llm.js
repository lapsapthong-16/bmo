const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expense parser. The user will send a short message describing a purchase or expense.

Extract the following fields and return ONLY valid JSON (no markdown, no explanation):
{
  "name": "Title Case item name",
  "category": "one of the categories below",
  "amount": number
}

Categories (pick the closest match):
- Food (meals, drinks, snacks, restaurants, cafes, hawker, food delivery)
- Transport (grab, taxi, mrt, bus, fuel, parking, toll, e-scooter)
- Groceries (supermarket, fresh produce, household supplies from grocery stores)
- Shopping (clothes, shoes, electronics, online shopping, accessories)
- Entertainment (movies, games, streaming subscriptions, concerts, hobbies)
- Bills (electricity, water, phone, internet, insurance, rent)
- Health (clinic, medicine, dental, gym, supplements, optical)
- Others (anything that doesn't fit above)

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
