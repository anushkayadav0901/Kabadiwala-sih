/**
 * chatService.js
 * Client for the Kabadi Mitra assistant. The conversation goes to our own
 * backend, which holds the AI provider key — no key is ever shipped to the
 * browser.
 */
import { api } from "./api";

/**
 * Send the conversation and return the assistant's reply.
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
    if (!navigator.onLine || error.message === "Failed to fetch") {
      throw new Error("Kabadi Mitra needs an internet connection. Please try again when you're online.");
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
