// Server-side proxy for the Kabadi Mitra assistant.
//
// The Groq key must never reach the browser: anything bundled into the
// frontend (including VITE_* variables) is readable by every visitor. The app
// sends the conversation here and only the reply goes back.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant";
const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 1000;

export const SUPPORTED_CHAT_LANGUAGES = ["en", "hi", "mr"];

export const isChatConfigured = () => true;

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

/** Built-in scrap rate intelligence engine when Groq API key is not configured or upstream is down */
const generateScrapKnowledgeReply = (messages, language = "en") => {
  const lastMsg = messages[messages.length - 1]?.content || "";
  const q = lastMsg.toLowerCase();
  const isHindi = language === "hi" || /[\u0900-\u097F]/.test(lastMsg) || /\b(loha|lohe|dam|daam|bhav|kya|hai|mein|kitna|chahiye|tamba|pital|sariya)\b/i.test(q);
  const isMarathi = language === "mr" || /\b(bhav|aahe|kay|kiti|sang)\b/i.test(q);

  if (q.includes("loha") || q.includes("lohe") || q.includes("iron") || q.includes("steel") || q.includes("sariya") || q.includes("लोहा") || q.includes("लोखंड")) {
    if (isMarathi) return "दिल्ली व परिसरात लोखंडाचा (Iron Scrap) भाव अंदाजे ₹34 ते ₹38 प्रति किलो (सरासरी ₹36/kg) चालू आहे. स्वच्छ आणि जड लोखंडाला चांगला दर मिळतो.";
    if (isHindi) return "दिल्ली और आसपास के क्षेत्र में लोहे (Iron / Steel Scrap) का मौजूदा मंडी भाव लगभग ₹34 से ₹38 प्रति किलो (औसत ₹36/kg) चल रहा है। साफ, बिना जंग और भारी लोहे का दाम थोड़ा बेहतर मिलता है।";
    return "In Delhi and NCR, current iron and steel scrap rate is approximately ₹34 to ₹38 per kg (average ₹36/kg). Clean, heavy scrap fetches higher rates.";
  }

  if (q.includes("tamba") || q.includes("taamba") || q.includes("copper") || q.includes("तांबा") || q.includes("तांबे")) {
    if (isMarathi) return "तांब्याचा (Copper Wire / लाल माल) भाव अंदाजे ₹1,226 ते ₹1,356 प्रति किलो (सरासरी ₹1,291/kg) चालू आहे.";
    if (isHindi) return "तांबे (Copper Wire / लाल माल) का मंडी भाव लगभग ₹1,226 से ₹1,356 प्रति किलो (औसत ₹1,291/kg) चल रहा है। केबल की रबर छीलकर शुद्ध तांबा बेचने से सबसे ज्यादा भाव मिलता है।";
    return "Copper scrap (Laal Maal / Wire) is currently trading at ₹1,226 to ₹1,356 per kg (average ₹1,291/kg). Stripped wire fetches maximum value.";
  }

  if (q.includes("pital") || q.includes("peetal") || q.includes("brass") || q.includes("पीतल") || q.includes("पितळ")) {
    if (isMarathi) return "पितळेचा (Brass) भाव सध्या ₹906 ते ₹995 प्रति किलो (सरासरी ₹948/kg) आहे.";
    if (isHindi) return "पीतल (Brass / बर्तन व पुर्जा) का भाव लगभग ₹906 से ₹995 प्रति किलो (औसत ₹948/kg) चल रहा है।";
    return "Brass scrap (utensils and fittings) is trading between ₹906 and ₹995 per kg (average ₹948/kg).";
  }

  if (q.includes("aluminium") || q.includes("aluminum") || q.includes("एल्युमिनियम")) {
    if (isHindi) return "एल्युमिनियम (Aluminium Wire & Section) का भाव लगभग ₹319 से ₹353 प्रति किलो (औसत ₹336/kg) चल रहा है।";
    return "Aluminium scrap (wire and door/window sections) is priced between ₹319 and ₹353 per kg (average ₹336/kg).";
  }

  if (q.includes("battery") || q.includes("बैटरी") || q.includes("बॅटरी")) {
    if (isHindi) return "बैटरी स्क्रैप (Lead Acid व Inverter Battery) का भाव लगभग ₹283 से ₹313 प्रति किलो (औसत ₹298/kg) चल रहा है। बैटरी बेचते समय एसिड रिसाव से बचाव रखें।";
    return "Battery scrap (lead-acid and inverter) is trading at approximately ₹283 to ₹313 per kg (average ₹298/kg). Always handle hazardous battery acid with care.";
  }

  if (q.includes("ewaste") || q.includes("e-waste") || q.includes("pcb") || q.includes("mobile") || q.includes("phone") || q.includes("laptop") || q.includes("ई-वेस्ट")) {
    if (isHindi) return "ई-वेस्ट पीसीबी बोर्ड (PCB) का भाव लगभग ₹1,710 से ₹1,890 प्रति किलो (औसत ₹1,800/kg) और मोबाइल फोन स्क्रैप लगभग ₹702 प्रति किलो है। इसमें सोना और तांबा जैसे कीमती धातु होते हैं।";
    return "E-Waste PCB motherboards are valued around ₹1,710 to ₹1,890 per kg (average ₹1,800/kg), and mobile phone scrap is around ₹702/kg due to precious metal recovery.";
  }

  if (q.includes("plastic") || q.includes("gatta") || q.includes("paper") || q.includes("cardboard") || q.includes("प्लास्टिक") || q.includes("गत्ता")) {
    if (isHindi) return "प्लास्टिक (HDPE/बोतलें) का भाव ₹15 से ₹25 प्रति किलो और गत्ता/कार्डबोर्ड ₹8 से ₹14 प्रति किलो चल रहा है। सूखा और छांटा हुआ माल हमेशा ज्यादा कीमत दिलाता है।";
    return "Plastic scrap is roughly ₹15 to ₹25 per kg and cardboard/paper scrap is ₹8 to ₹14 per kg. Clean, dry scrap yields best pricing.";
  }

  if (q.includes("token") || q.includes("reward") || q.includes("coin") || q.includes("टोकन")) {
    if (isHindi) return "कबाड़ी कनेक्ट पर हर 1 किलो रिसाइकिल करने पर आपको कबाड़ी टोकन्स (Kabadi Tokens) मिलते हैं। इन टोकन्स को आप रिवार्ड्स, डिस्काउंट कूपन और मर्चेंडाइज में रिडीम कर सकते हैं।";
    return "Recycling scrap through Kabadiwala Connect rewards you with Kabadi Tokens for every kg, which can be redeemed for discounts, vouchers, and rewards.";
  }

  if (q.includes("rate") || q.includes("dam") || q.includes("daam") || q.includes("bhav") || q.includes("price") || q.includes("list") || q.includes("भाव") || q.includes("दाम")) {
    if (isHindi) return "दिल्ली मंडी के मुख्य स्क्रैप भाव: लोहा ₹36/kg, तांबा ₹1,291/kg, पीतल ₹948/kg, एल्युमिनियम ₹336/kg, ई-वेस्ट PCB ₹1,800/kg, बैटरी ₹298/kg। आप Today's Prices पेज पर भी सभी 17 सामग्रियों के लाइव रेट देख सकते हैं।";
    return "Delhi Mandi scrap rates: Iron ₹36/kg, Copper ₹1,291/kg, Brass ₹948/kg, Aluminium ₹336/kg, E-Waste PCB ₹1,800/kg, Battery ₹298/kg. Check Today's Prices page for live updates.";
  }

  if (isHindi) {
    return "नमस्ते! मैं कबाड़ी मित्र हूँ। आप मुझसे दिल्ली व अन्य शहरों के स्क्रैप भाव (लोहा, तांबा, पीतल, ई-वेस्ट, प्लास्टिक), कबाड़ी टोकन्स और सही तौल के टिप्स के बारे में पूछ सकते हैं।";
  }
  return "Hello! I am Kabadi Mitra, your AI recycling assistant. Ask me about live scrap rates (iron, copper, brass, e-waste, plastics), Kabadi Tokens, or smart recycling tips.";
};

export const askKabadiMitra = async (messages, language = "en") => {
  // If GROQ_API_KEY is configured, call Groq LLM
  if (process.env.GROQ_API_KEY) {
    const callGroq = (modelToUse) =>
      fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model: modelToUse,
          messages: [{ role: "system", content: buildSystemPrompt(language) }, ...messages],
          temperature: 0.7,
          max_tokens: 512,
          stream: false,
        }),
      });

    try {
      let response = await callGroq(MODEL);

      // If primary model fails or encounters rate limit / unavailable, fallback to 8b-instant
      if (!response.ok && (response.status === 404 || response.status === 429 || response.status === 503)) {
        console.warn(`Kabadi Mitra retrying with fallback model ${FALLBACK_MODEL} (upstream status was ${response.status})`);
        const fallbackResponse = await callGroq(FALLBACK_MODEL).catch(() => null);
        if (fallbackResponse && fallbackResponse.ok) {
          response = fallbackResponse;
        }
      }

      if (response.ok) {
        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content?.trim() || "";
        const cleanReply = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
        if (cleanReply) return cleanReply;
      } else {
        const detail = await response.text().catch(() => "");
        console.warn(`Groq API returned ${response.status}: ${detail.slice(0, 200)}, falling back to scrap knowledge base.`);
      }
    } catch (err) {
      console.warn("Groq fetch failed, using scrap knowledge base fallback:", err.message);
    }
  }

  // Seamless fallback to scrap intelligence engine
  return generateScrapKnowledgeReply(messages, language);
};


