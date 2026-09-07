/**
 * chatService.js
 * Groq-powered AI assistant for Kabadiwala Connect.
 * Uses llama-3.3-70b-versatile — the fastest publicly-available large model
 * on Groq's inference cloud.
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = "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";
const MODEL = "openai/gpt-oss-120b";

// Language → human-readable name for the system prompt
const LANG_NAMES = {
  en: "English",
  hi: "Hindi (हिन्दी)",
  mr: "Marathi (मराठी)",
};

/**
 * Build the system prompt.
 * The assistant is instructed to reply in the same language the user is using
 * and to stay grounded in the Kabadiwala Connect domain.
 */
function buildSystemPrompt(language) {
  const langName = LANG_NAMES[language] || "English";
  return `You are Kabadi Mitra, the friendly AI assistant for Kabadiwala Connect — India's leading scrap-recycling platform.

You help waste collectors and recyclers with:
• Scrap categories, current market prices (metals, e-waste, plastics, paper, batteries)
• How to weigh, sort, and sell scrap items for the best price
• Digital Kabadi Tokens — how to earn them through recycling, and how to redeem for rewards
• Recycler Ratings — how the fair-pricing and punctuality rating system works
• Gamification — streaks, challenges, badges, leaderboard, and levels
• Finding nearby kabadiwalas and scheduling a pickup
• Environmental impact of recycling and eco-friendly practices
• Safety while handling hazardous materials (batteries, e-waste, chemicals)
• Government schemes and policies for informal waste workers in India
• General guidance on earning more from scrap recycling

IMPORTANT RULES:
1. ALWAYS reply in ${langName}. If the user writes in a different language, still respond in ${langName}.
2. Be warm, conversational, and encouraging — like a knowledgeable friend, not a corporate FAQ.
3. Keep responses concise and mobile-friendly. Use short paragraphs.
4. When quoting prices, mention they are approximate and can vary by city and recycler.
5. You are NOT a general-purpose assistant. Politely redirect off-topic questions back to recycling, waste management, or the Kabadiwala Connect platform.
6. For emergency safety issues, always advise calling local authorities.

Platform context:
- App name: Kabadiwala Connect
- Languages supported: English, Hindi, Marathi
- Token system: Kabadi Tokens earned per kg recycled, redeemable for rewards
- Gamification: Daily streaks, badges (Bronze Recycler, Silver Eco-Warrior, Gold Planet Saver, Platinum Champion), weekly challenges
- Rating criteria: Fair pricing, punctuality, behaviour, weighing accuracy, eco-friendly practices
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
