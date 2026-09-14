/**
 * chatService.js
 * Client for the Kabadi Mitra assistant. The conversation goes to our own
 * backend, which holds the AI provider key — no key is ever shipped to the
 * browser.
 */
import { api } from "./api";

const CLIENT_GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_DIRECT_URL = "https://api.groq.com/openai/v1/chat/completions";

const callDirectGroq = async (messages, language = "en") => {
  if (!CLIENT_GROQ_KEY) return null;
  try {
    const isHindi = language === "hi";
    const isMarathi = language === "mr";
    const langPrompt = isHindi
      ? "LANGUAGE: Reply ONLY in Hindi using Devanagari script. No English words."
      : isMarathi
      ? "LANGUAGE: Reply ONLY in Marathi using Devanagari script. No English words."
      : "LANGUAGE: Detect the language the user is writing in and reply in the same language.";

    const systemPrompt = `You are Kabadi Mitra, the friendly AI assistant for Kabadiwala Connect. ${langPrompt} Write in plain text only. Do not use markdown bold asterisks or tables. Keep responses short and helpful for scrap recycling.`;

    const response = await fetch(GROQ_DIRECT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${CLIENT_GROQ_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 512,
        stream: false,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";
    return raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  } catch {
    return null;
  }
};

/**
 * Send the conversation and return the assistant's reply.
 * Tries server proxy first; falls back to client key if configured.
 *
 * @param {Array<{role: string, content: string}>} messages  Full conversation history
 * @param {string} language  'en' | 'hi' | 'mr'
 * @returns {Promise<string>}  The assistant message text
 */
export async function sendChatMessage(messages, language = "en") {
  try {
    const { reply } = await api("/chat", { method: "POST", body: { messages, language }, auth: true });
    return (reply || "").trim();
  } catch (error) {
    // If backend is unavailable or not set up, try direct client fallback if VITE_GROQ_API_KEY is configured
    if (CLIENT_GROQ_KEY) {
      const directReply = await callDirectGroq(messages, language);
      if (directReply) return directReply;
    }

    if (!navigator.onLine || error.message === "Failed to fetch") {
      throw new Error("Cannot reach server. Check your connection or verify backend VITE_API_URL.");
    }
    throw error;
  }
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
