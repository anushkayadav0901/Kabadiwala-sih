// Bilingual (Hindi/English) reply text for the WhatsApp bot. Mirrors the
// t(hi, en) helper pattern already used in ivrPrompts.js so the two channels
// stay consistent in how they store translated strings.

const t = (hi, en) => ({ hi, en });

// Spoken/typed labels for material categories, used when we already know the
// category key (from a price lookup or text match). Classifier-detected item
// names (e.g. "cracked LCD monitor") come from Gemini in English and are left
// as-is rather than machine-translated, since mistranslating a specific
// detected item is worse than showing it in English.
const CATEGORY_LABELS_HI = {
  PCB: "पीसीबी",
  copper: "तांबा",
  cables: "केबल",
  batteries: "बैटरी",
  LCD: "एलसीडी",
  CRT: "सीआरटी",
  motors: "मोटर",
  metal: "धातु",
  e_waste: "ई-वेस्ट",
  mixed_plastic: "प्लास्टिक"
};

export const categoryLabel = (lang, category) =>
  lang === "hi" ? CATEGORY_LABELS_HI[category] || category : category;

export const LANGUAGE_SWITCH_WORDS = {
  hi: ["hindi", "हिंदी", "हिन्दी"],
  en: ["english", "इंग्लिश", "अंग्रेजी", "अंग्रेज़ी"]
};

// Returns "hi" or "en" if the text is a language-switch command, else null.
export const detectLanguageSwitch = (text = "") => {
  const lower = String(text).trim().toLowerCase();
  if (LANGUAGE_SWITCH_WORDS.hi.some((w) => lower === w.toLowerCase())) return "hi";
  if (LANGUAGE_SWITCH_WORDS.en.some((w) => lower === w.toLowerCase())) return "en";
  return null;
};

export const languageSwitchedLine = (lang) =>
  ({
    hi: "भाषा हिंदी में सेट कर दी गई। शुरू करने के लिए स्क्रैप की फोटो भेजें, या मदद के लिए HELP लिखें।",
    en: "Language set to English. Send a scrap photo to begin, or type HELP for help."
  }[lang]);

export const safetyLine = (lang) =>
  ({
    hi: "सुरक्षा: केबल न जलाएं, स्क्रीन न तोड़ें, और बैटरी न खोलें। बैटरी को सूखा रखें और फूली हुई बैटरी को अलग रखें। शुरू करने के लिए स्क्रैप की फोटो भेजें।",
    en: "Safety: do not burn cables, break screens, or open batteries. Keep batteries dry and isolate swollen cells. Send a scrap photo to begin."
  }[lang]);

export const invalidWeightLine = (lang) =>
  ({
    hi: "कृपया वज़न किलोग्राम में बताएं, उदाहरण के लिए: 5 या 5 किलो।",
    en: "Please reply with the weight in kg, for example: 5 or 5 kilo."
  }[lang]);

export const priceNotFoundLine = (lang, category) =>
  ({
    hi: `${category} के लिए आज का भाव नहीं मिला। पीसीबी, तांबा, बैटरी, एलसीडी, या धातु आज़माएं।`,
    en: `I could not find today's price for ${category}. Try PCB, copper, battery, LCD, or metal.`
  }[lang]);

export const priceOnlyLine = (lang, category, range) =>
  ({
    hi: `${category} का आज का उचित भाव: ${range}। फोटो भेजें या किसी और सामान का भाव पूछें।`,
    en: `Today's fair price for ${category}: ${range}. Send a photo or ask another material's rate.`
  }[lang]);

export const priceWithWeightLine = (lang, weight, category, range, amount) =>
  ({
    hi: `${weight} किलो ${category} की कीमत आज के भाव (${range}) पर लगभग ${amount} है।`,
    en: `${weight}kg ${category} is approximately ${amount} at today's fair range (${range}).`
  }[lang]);

export const recyclerFoundLine = (lang, name, rating) =>
  ({
    hi: `सबसे नज़दीकी अधिकृत रीसाइक्लर: ${name} (${rating}/5 भरोसा रेटिंग)।`,
    en: `Nearest authorized recycler: ${name} (${rating}/5 trust rating).`
  }[lang]);

export const recyclerNotFoundLine = (lang) =>
  ({
    hi: "इस सामान के लिए अभी कोई अधिकृत रीसाइक्लर सूचीबद्ध नहीं है।",
    en: "No authorized recycler is currently listed for this material."
  }[lang]);

export const confirmLotPrompt = (lang) =>
  ({
    hi: "लॉट बनाने के लिए YES लिखें, या केवल भाव जानने के लिए SKIP लिखें।",
    en: "Reply YES to create a lot, or SKIP to only check the price."
  }[lang]);

export const lotCancelledLine = (lang) =>
  ({
    hi: "ठीक है, कोई लॉट नहीं बनाया गया। कभी भी दूसरे सामान की फोटो भेजें या भाव पूछें।",
    en: "Okay, no lot was created. Send another material photo or ask a price anytime."
  }[lang]);

export const invalidConfirmationLine = (lang) =>
  ({
    hi: "इस लॉट को बनाने के लिए YES लिखें, या रद्द करने के लिए SKIP लिखें।",
    en: "Reply YES to create this lot, or SKIP to cancel."
  }[lang]);

export const lotCreatedLine = (lang, reference) =>
  ({
    hi: `लॉट बन गया! रेफरेंस: ${reference}\nयह कोड रीसाइक्लर को दिखाएं।\nसुरक्षा: केबल न जलाएं या बैटरी का एसिड न बहने दें। जानकारी के लिए SAFETY लिखें।`,
    en: `Lot created! Reference: ${reference}\nShow this code to the recycler.\nSafety: don't burn cables or leak battery acid. Reply SAFETY for details.`
  }[lang]);

export const geminiNotConfiguredLine = (lang) =>
  ({
    hi: "फोटो मिल गई, लेकिन इमेज पहचान सेटअप नहीं है। कृपया एडमिन से GEMINI_API_KEY सेट करने को कहें, फिर दोबारा फोटो भेजें।",
    en: "Photo received, but image classification is not configured. Please ask the administrator to set GEMINI_API_KEY, then send the photo again."
  }[lang]);

export const audioTranscribeFailedLine = (lang) =>
  ({
    hi: "आपका वॉइस नोट मिला लेकिन उसे समझा नहीं जा सका। कृपया छोटा वॉइस नोट भेजें या टाइप करके पूछें।",
    en: "I received your voice note but could not transcribe it. Please try a shorter voice note or type your query."
  }[lang]);

export const audioUnclearLine = (lang) =>
  ({
    hi: "वॉइस नोट साफ़ सुनाई नहीं दिया। कृपया दोबारा कोशिश करें या टाइप करें।",
    en: "I could not hear the voice note clearly. Please try again or type your query."
  }[lang]);

export const materialNotIdentifiedLine = (lang) =>
  ({
    hi: "मैं उस सामान को पहचान नहीं सका। कृपया साफ फोटो भेजें या टेक्स्ट में भाव पूछें।",
    en: "I could not identify that material. Please send a clearer photo or ask its price by text."
  }[lang]);

export const invalidImageLine = (lang) =>
  ({
    hi: "अमान्य फोटो: कृपया इनमें से किसी एक सामान की साफ फोटो भेजें: पीसीबी, केबल, बैटरी, एलसीडी पैनल, सीआरटी, मोटर/मैग्नेट असेंबली, या मिला-जुला प्लास्टिक।",
    en: "Invalid image: please send a clear photo of one supported e-waste material: PCB, cable, battery, LCD panel, CRT, motor/magnet assembly, or mixed plastic."
  }[lang]);

export const materialIdentifiedLine = (lang, name, confidence, priceText) =>
  ({
    hi: `यह ${name} जैसा लग रहा है (${confidence}% विश्वास)।\n${priceText}\nआपके पास कितना वज़न (किलो में) है?`,
    en: `This looks like ${name} (${confidence}% confidence).\n${priceText}\nHow much weight do you have in kg?`
  }[lang]);

export const defaultHelpLine = (lang) =>
  ({
    hi: "पहचान के लिए स्क्रैप की फोटो भेजें, या भाव पूछने के लिए टाइप करें जैसे 'PCB rate?' या '5 kilo copper rate'। सुरक्षा जानकारी के लिए SAFETY, भाषा बदलने के लिए ENGLISH लिखें।",
    en: "Send a scrap photo for classification, or type a price query such as 'PCB rate?' or '5 kilo copper rate'. Reply SAFETY for handling guidance, or HINDI to switch language."
  }[lang]);