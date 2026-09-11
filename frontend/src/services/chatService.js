/**
 * chatService.js
 * Groq-powered AI assistant for Kabadiwala Connect.
 * Uses llama-3.3-70b-versatile — the fastest publicly-available large model
 * on Groq's inference cloud.
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const MODEL = "openai/gpt-oss-120b";

// Language → human-readable name for the system prompt
const LANG_NAMES = {
  en: "English",
  hi: "Hindi (हिन्दी)",
  mr: "Marathi (मराठी)",
};

/**
 * Build the system prompt.
 * Enforces reply language and bans all markdown formatting.
 */
function buildSystemPrompt(language) {
  const isHindi = language === "hi";
  const isMarathi = language === "mr";

  const langEnforcement = isHindi
    ? "LANGUAGE: You MUST reply ONLY in Hindi using Devanagari script. Do NOT use English at all, even for a single word. The user may write in English — you still reply fully in Hindi."
    : isMarathi
    ? "LANGUAGE: You MUST reply ONLY in Marathi using Devanagari script. Do NOT use English at all, even for a single word. The user may write in English — you still reply fully in Marathi."
    : "LANGUAGE: Detect the language the user is writing in and respond in the same language. If the user writes in Hindi, respond in Hindi. If the user writes in Marathi, respond in Marathi. If the user writes in English, respond in English. If the user asks you to switch language, do so immediately.";

  return `You are Kabadi Mitra, the friendly AI assistant for Kabadiwala Connect — India's leading scrap-recycling platform.

${langEnforcement}

FORMATTING — STRICTLY FOLLOW THESE RULES:
- Write in plain text only. Do NOT use any markdown.
- Never use asterisks (*), double asterisks (**), hashes (#), underscores, backticks, or pipe characters.
- Never create tables or horizontal rules.
- Use simple numbered lists (1. 2. 3.) or plain prose instead of dash bullets.
- Keep responses short: 3 to 5 sentences max unless the question genuinely requires more.

You help with: scrap prices (metals, e-waste, plastics, paper, batteries), selling and weighing tips, Kabadi Tokens (earning per kg, redeeming for rewards), Recycler Ratings (fair pricing, punctuality, behaviour, weighing accuracy), gamification (streaks, badges, leaderboard), finding nearby kabadiwalas, environmental impact, safety with hazardous materials, and government schemes for waste workers.

Other rules:
- Be warm and encouraging, like a knowledgeable friend.
- Prices are approximate and vary by city.
- Do not answer questions unrelated to recycling or Kabadiwala Connect. Redirect politely.

Platform context: Kabadiwala Connect app. Badges: Bronze Recycler, Silver Eco-Warrior, Gold Planet Saver, Platinum Champion. Tokens earned per kg recycled, redeemable for discounts and rewards.
`;
}

/**
 * Send a message to the Groq API and return the assistant's reply.
 *
 * @param {Array<{role: string, content: string}>} messages  Full conversation history
 * @param {string} language  'en' | 'hi' | 'mr'
 * @returns {Promise<string>}  The assistant message text
 */
export async function sendChatMessage(messages, language = "en") {
  if (!GROQ_API_KEY) {
    throw new Error("Assistant service is not configured. Please add VITE_GROQ_API_KEY in your frontend environment settings.");
  }

  const systemMessage = {
    role: "system",
    content: buildSystemPrompt(language),
  };

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 512,
      stream: false,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq API error ${response.status}`);
  }

  const data = await response.json();
  const raw = data.choices[0]?.message?.content?.trim() || "";
  // Strip chain-of-thought <think>…</think> blocks from reasoning models
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

/**
 * Map app language IDs to BCP-47 locale codes used by the
 * Web Speech API for both recognition and synthesis.
 */
export const SPEECH_LOCALES = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};
