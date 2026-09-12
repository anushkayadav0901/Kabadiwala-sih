// Server-side proxy for the Kabadi Mitra assistant.
//
// The Groq key must never reach the browser: anything bundled into the
// frontend (including VITE_* variables) is readable by every visitor. The app
// sends the conversation here and only the reply goes back.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_TEXT_MODEL || "openai/gpt-oss-120b";
const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 1000;

export const SUPPORTED_CHAT_LANGUAGES = ["en", "hi", "mr"];

export const isChatConfigured = () => Boolean(process.env.GROQ_API_KEY);

const buildSystemPrompt = (language) => {
  const langEnforcement = language === "hi"
    ? "LANGUAGE: You MUST reply ONLY in Hindi using Devanagari script. Do NOT use English at all, even for a single word. The user may write in English — you still reply fully in Hindi."
    : language === "mr"
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
};

/** Keep only well-formed user/assistant turns, capped in count and length. Returns null if unusable. */
export const sanitizeChatMessages = (messages) => {
  if (!Array.isArray(messages)) return null;
  const cleaned = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS_PER_MESSAGE) }))
    .filter((m) => m.content)
    .slice(-MAX_MESSAGES);
  if (!cleaned.length || cleaned[cleaned.length - 1].role !== "user") return null;
  return cleaned;
};

export class ChatServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const askKabadiMitra = async (messages, language = "en") => {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: buildSystemPrompt(language) }, ...messages],
      temperature: 0.7,
      max_tokens: 512,
      stream: false,
    }),
  });

  if (!response.ok) {
    // Provider details stay in the server log; the app gets a plain message.
    const detail = await response.text().catch(() => "");
    console.error(`Kabadi Mitra upstream error ${response.status}: ${detail.slice(0, 300)}`);
    if (response.status === 429) throw new ChatServiceError(503, "Kabadi Mitra is busy right now. Please try again in a minute.");
    throw new ChatServiceError(502, "Kabadi Mitra is unavailable right now. Please try again shortly.");
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || "";
  // Reasoning models can wrap their working in <think> blocks.
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
};
