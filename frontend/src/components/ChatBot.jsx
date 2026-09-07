/**
 * ChatBot.jsx
 * Floating AI assistant for Kabadiwala Connect.
 *
 * Features:
 *  • Text input with send button
 *  • Voice input via Web Speech API (SpeechRecognition)
 *  • Voice output via Web Speech API (SpeechSynthesis)
 *  • Vernacular — follows the app's active language (en / hi / mr)
 *  • Animated slide-up sheet, glassmorphism header
 *  • Powered by Groq (llama-3.3-70b-versatile)
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineMicrophone,
  HiOutlineStop,
  HiOutlinePaperAirplane,
  HiOutlineXMark,
  HiOutlineSpeakerWave,
  HiOutlineSpeakerXMark,
  HiOutlineArrowPath,
  HiOutlineSparkles,
  HiOutlineGlobeAlt,
} from "react-icons/hi2";
import { sendChatMessage, SPEECH_LOCALES } from "../services/chatService";
import { useApp } from "../context/AppContext";
import { LANGUAGES } from "../utils/constants";

/* ── greeting text per language ─────────────────────────────────────────── */
const GREETINGS = {
  en: "Hi! I'm Kabadi Mitra, your recycling assistant. How can I help you today?",
  hi: "नमस्ते! मैं कबाड़ी मित्र हूँ, आपका रीसाइक्लिंग सहायक। आज मैं आपकी कैसे मदद कर सकता हूँ?",
  mr: "नमस्कार! मी कबाड़ी मित्र आहे, तुमचा रीसायकलिंग सहाय्यक. आज मी तुम्हाला कशी मदत करू शकतो?",
};

const PLACEHOLDERS = {
  en: "Ask about scrap prices, tokens, ratings…",
  hi: "कबाड़ की कीमत, टोकन, रेटिंग के बारे में पूछें…",
  mr: "भंगाराची किंमत, टोकन, रेटिंग बद्दल विचारा…",
};

const LANG_LABELS = {
  en: "English",
  hi: "हिन्दी",
  mr: "मराठी",
};

export function ChatBot() {
  const { language } = useApp();

  /* ── UI state ────────────────────────────────────────────────────── */
  const [open, setOpen] = useState(false);
  const [chatLang, setChatLang] = useState(language);
  const [messages, setMessages] = useState([
    { role: "assistant", content: GREETINGS[language] || GREETINGS.en, id: "init" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ── voice state ─────────────────────────────────────────────────── */
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);

  /* ── refs ────────────────────────────────────────────────────────── */
  const recognitionRef = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const utteranceRef = useRef(null);

  /* ── detect speech API support ───────────────────────────────────── */
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SR && !!window.speechSynthesis);
  }, []);

  /* ── sync chatLang when app language changes ─────────────────────── */
  useEffect(() => {
    setChatLang(language);
  }, [language]);

  /* ── reset greeting when language changes ────────────────────────── */
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: GREETINGS[chatLang] || GREETINGS.en,
        id: "init",
      },
    ]);
  }, [chatLang]);

  /* ── auto-scroll ─────────────────────────────────────────────────── */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ── focus input when opened ─────────────────────────────────────── */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 320);
  }, [open]);

  /* ── speak helper ────────────────────────────────────────────────── */
  const speak = useCallback(
    (text) => {
      if (!ttsEnabled || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = SPEECH_LOCALES[chatLang] || "en-IN";
      utt.rate = 0.95;
      utt.onstart = () => setIsSpeaking(true);
      utt.onend = () => setIsSpeaking(false);
      utt.onerror = () => setIsSpeaking(false);
      utteranceRef.current = utt;
      window.speechSynthesis.speak(utt);
    },
    [ttsEnabled, chatLang]
  );

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  /* ── send message ────────────────────────────────────────────────── */
  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || input).trim();
      if (!trimmed || loading) return;

      setError(null);
      const userMsg = { role: "user", content: trimmed, id: `u_${Date.now()}` };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);

      try {
        // Only send role+content to the API
        const apiMessages = nextMessages.map(({ role, content }) => ({
          role,
          content,
        }));
        const reply = await sendChatMessage(apiMessages, chatLang);
        const assistantMsg = {
          role: "assistant",
          content: reply,
          id: `a_${Date.now()}`,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        speak(reply);
      } catch (err) {
        setError(err.message || "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, chatLang, speak]
  );

  /* ── voice input ─────────────────────────────────────────────────── */
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    stopSpeaking();
    const rec = new SR();
    rec.lang = SPEECH_LOCALES[chatLang] || "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
  }, [chatLang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  /* ── keyboard shortcuts ──────────────────────────────────────────── */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ── clear chat ──────────────────────────────────────────────────── */
  const clearChat = () => {
    stopSpeaking();
    setMessages([
      {
        role: "assistant",
        content: GREETINGS[chatLang] || GREETINGS.en,
        id: `init_${Date.now()}`,
      },
    ]);
    setError(null);
  };

  /* ── render ──────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Floating Action Button ─────────────────────────────────── */}
      <button
        id="chatbot-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Kabadi Mitra AI assistant"
        style={{
          position: "fixed",
          bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          right: "16px",
          zIndex: 60,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: "linear-gradient(135deg, #4B45E0 0%, #7C78F0 100%)",
          boxShadow: "0 4px 20px rgba(75,69,224,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.boxShadow = "0 6px 28px rgba(75,69,224,0.55)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(75,69,224,0.45)";
        }}
      >
        {open ? (
          <HiOutlineXMark size={24} />
        ) : (
          <HiOutlineChatBubbleLeftEllipsis size={24} />
        )}
      </button>

      {/* ── Chat Sheet ────────────────────────────────────────────── */}
      {open && (
        <div
          id="chatbot-sheet"
          style={{
            position: "fixed",
            bottom: "calc(156px + env(safe-area-inset-bottom, 0px))",
            right: "12px",
            left: "12px",
            maxWidth: 420,
            margin: "0 auto",
            zIndex: 59,
            borderRadius: 20,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: "min(520px, calc(100dvh - 200px))",
            boxShadow:
              "0 -4px 40px rgba(15,20,36,0.22), 0 8px 32px rgba(15,20,36,0.18)",
            animation: "chatSlideUp 0.28s cubic-bezier(0.34,1.36,0.64,1) both",
          }}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <div
            style={{
              background: "linear-gradient(135deg, #3A34D4 0%, #4B45E0 60%, #7C78F0 100%)",
              padding: "14px 16px 12px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <HiOutlineSparkles size={20} color="#fff" />
            </div>

            {/* Title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                Kabadi Mitra
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.72)",
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                AI Recycling Assistant · Powered by Groq
              </div>
            </div>

            {/* Language selector */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <select
                id="chatbot-language-select"
                value={chatLang}
                onChange={(e) => setChatLang(e.target.value)}
                aria-label="Select chat language"
                style={{
                  appearance: "none",
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "4px 24px 4px 8px",
                  cursor: "pointer",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id} style={{ color: "#0F1424" }}>
                    {LANG_LABELS[l.id] || l.name}
                  </option>
                ))}
              </select>
              <HiOutlineGlobeAlt
                size={13}
                color="rgba(255,255,255,0.8)"
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* TTS toggle */}
            <button
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setTtsEnabled((v) => !v);
              }}
              title={ttsEnabled ? "Mute voice responses" : "Unmute voice responses"}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 8,
                color: "#fff",
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {ttsEnabled ? (
                <HiOutlineSpeakerWave size={15} />
              ) : (
                <HiOutlineSpeakerXMark size={15} />
              )}
            </button>

            {/* Clear */}
            <button
              onClick={clearChat}
              title="Clear conversation"
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 8,
                color: "#fff",
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <HiOutlineArrowPath size={15} />
            </button>
          </div>

          {/* ── Messages area ──────────────────────────────────────── */}
          <div
            id="chatbot-messages"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: "#F5F6FA",
              scrollbarWidth: "thin",
              scrollbarColor: "#E4E7F0 transparent",
            }}
          >
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onSpeak={speak} ttsEnabled={ttsEnabled} />
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #4B45E0, #7C78F0)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <HiOutlineSparkles size={14} color="#fff" />
                </div>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #E4E7F0",
                    borderRadius: "4px 16px 16px 16px",
                    padding: "10px 14px",
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                    boxShadow: "0 1px 3px rgba(15,20,36,0.06)",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#4B45E0",
                        opacity: 0.6,
                        animation: `chatDot 1.2s ${i * 0.2}s ease-in-out infinite`,
                        display: "block",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div
                style={{
                  background: "#FDECEE",
                  border: "1px solid #FBD9DD",
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: "#C22334",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {error}
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* ── Voice listening banner ─────────────────────────────── */}
          {isListening && (
            <div
              style={{
                background: "linear-gradient(90deg, #EEEDFC, #DEDCF9)",
                borderTop: "1px solid #C2BEF4",
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexShrink: 0,
              }}
            >
              {/* Pulse rings */}
              <div style={{ position: "relative", width: 20, height: 20, flexShrink: 0 }}>
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: "#4B45E0",
                    opacity: 0.3,
                    animation: "chatPulse 1.2s ease-out infinite",
                  }}
                />
                <HiOutlineMicrophone
                  size={20}
                  color="#3A34D4"
                  style={{ position: "relative", zIndex: 1 }}
                />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#3A34D4", flex: 1 }}>
                Listening…
              </span>
              <button
                onClick={stopListening}
                style={{
                  background: "#4B45E0",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          )}

          {/* ── Input bar ──────────────────────────────────────────── */}
          <div
            style={{
              background: "#fff",
              borderTop: "1px solid #E4E7F0",
              padding: "10px 12px",
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              flexShrink: 0,
            }}
          >
            <textarea
              ref={inputRef}
              id="chatbot-input"
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-grow
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder={PLACEHOLDERS[chatLang] || PLACEHOLDERS.en}
              disabled={loading || isListening}
              style={{
                flex: 1,
                resize: "none",
                border: "1.5px solid #E4E7F0",
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 14,
                fontFamily: "inherit",
                color: "#0F1424",
                background: "#F5F6FA",
                outline: "none",
                lineHeight: 1.5,
                overflowY: "auto",
                minHeight: 42,
                maxHeight: 96,
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4B45E0")}
              onBlur={(e) => (e.target.style.borderColor = "#E4E7F0")}
            />

            {/* Mic button */}
            {speechSupported && (
              <button
                id="chatbot-mic-btn"
                onClick={isListening ? stopListening : startListening}
                disabled={loading}
                title={isListening ? "Stop listening" : "Speak your question"}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  background: isListening
                    ? "linear-gradient(135deg, #E0384A, #C22334)"
                    : "linear-gradient(135deg, #EEEDFC, #DEDCF9)",
                  color: isListening ? "#fff" : "#3A34D4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.2s, transform 0.15s",
                  boxShadow: isListening
                    ? "0 2px 12px rgba(224,56,74,0.35)"
                    : "0 1px 4px rgba(15,20,36,0.1)",
                }}
              >
                {isListening ? (
                  <HiOutlineStop size={18} />
                ) : (
                  <HiOutlineMicrophone size={18} />
                )}
              </button>
            )}

            {/* Send button */}
            <button
              id="chatbot-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              title="Send message"
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                border: "none",
                cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                background:
                  !input.trim() || loading
                    ? "#E4E7F0"
                    : "linear-gradient(135deg, #4B45E0, #7C78F0)",
                color: !input.trim() || loading ? "#7B85A0" : "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.2s, transform 0.15s",
                boxShadow:
                  !input.trim() || loading
                    ? "none"
                    : "0 2px 12px rgba(75,69,224,0.4)",
              }}
            >
              <HiOutlinePaperAirplane size={18} style={{ transform: "rotate(-45deg)" }} />
            </button>
          </div>
        </div>
      )}

      {/* ── Keyframe animations (injected once) ──────────────────────── */}
      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatDot {
          0%, 100% { opacity: 0.3; transform: scaleY(0.8); }
          50%       { opacity: 1;   transform: scaleY(1.2); }
        }
        @keyframes chatPulse {
          0%   { transform: scale(1);   opacity: 0.35; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        #chatbot-messages::-webkit-scrollbar { width: 4px; }
        #chatbot-messages::-webkit-scrollbar-track { background: transparent; }
        #chatbot-messages::-webkit-scrollbar-thumb { background: #E4E7F0; border-radius: 4px; }
      `}</style>
    </>
  );
}

/* ── Individual message bubble ─────────────────────────────────────────── */
function MessageBubble({ msg, onSpeak, ttsEnabled }) {
  const isUser = msg.role === "user";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      {/* Avatar (assistant only) */}
      {!isUser && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #4B45E0, #7C78F0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <HiOutlineSparkles size={13} color="#fff" />
        </div>
      )}

      {/* Bubble */}
      <div
        style={{
          maxWidth: "78%",
          background: isUser
            ? "linear-gradient(135deg, #4B45E0, #5D58E8)"
            : "#fff",
          color: isUser ? "#fff" : "#0F1424",
          borderRadius: isUser
            ? "16px 4px 16px 16px"
            : "4px 16px 16px 16px",
          padding: "10px 13px",
          fontSize: 13.5,
          lineHeight: 1.55,
          fontWeight: isUser ? 500 : 400,
          border: isUser ? "none" : "1px solid #E4E7F0",
          boxShadow: isUser
            ? "0 2px 12px rgba(75,69,224,0.25)"
            : "0 1px 3px rgba(15,20,36,0.06)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          position: "relative",
        }}
      >
        {msg.content}

        {/* Speak icon on assistant messages */}
        {!isUser && ttsEnabled && (
          <button
            onClick={() => onSpeak(msg.content)}
            title="Read aloud"
            style={{
              position: "absolute",
              bottom: -8,
              right: 6,
              background: "#EEEDFC",
              border: "1px solid #C2BEF4",
              borderRadius: 6,
              padding: "2px 5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 3,
              color: "#3A34D4",
            }}
          >
            <HiOutlineSpeakerWave size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
