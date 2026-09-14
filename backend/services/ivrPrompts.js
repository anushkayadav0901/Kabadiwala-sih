// Spoken prompt text for the keypad-phone IVR flow, in Hindi and English only
// (Marathi was dropped per product decision — easy to re-add later by restoring
// the mr fields and a third WELCOME_SEGMENTS entry / languageForDigit mapping).
// Hindi is written in native Devanagari script — Twilio's hi-IN TTS voice is
// trained on that script and mispronounces romanized ("Hinglish") text badly.

export const LANGUAGES = ["hi", "en"];

// Maps our language code to the Twilio <Say language="..."> voice code.
export const sayLanguageFor = (lang) => ({ hi: "hi-IN", en: "en-IN" }[lang] || "en-IN");

// Digit pressed on the very first prompt, before we know the caller's language.
export const languageForDigit = (digit) => ({ "1": "hi", "2": "en" }[digit] || null);

// The only prompt said in both languages back to back, since we don't yet know
// which one the caller understands. Each segment carries its own language code
// so voiceService can <Say> it with the matching TTS voice.
export const WELCOME_SEGMENTS = [
  { lang: "hi", text: "कबाड़ीवाला कनेक्ट में आपका स्वागत है। हिंदी के लिए एक दबाएं।" },
  { lang: "en", text: "Welcome to Kabadiwala Connect. For English, press two." }
];

const t = (hi, en) => ({ hi, en });

export const PROMPTS = {
  invalidDigit: t(
    "माफ़ कीजिए, गलत बटन दबाया गया। कृपया दोबारा कोशिश करें।",
    "Sorry, that wasn't a valid option. Please try again."
  ),
  navHint: t(
    "दोबारा सुनने के लिए स्टार दबाएं। मुख्य मेनू के लिए हैश दबाएं।",
    "Press star to repeat. Press hash to return to the main menu."
  ),
  mainMenu: t(
    "आज का भाव जानने के लिए एक दबाएं। नज़दीकी रीसाइक्लर ढूंढने के लिए दो दबाएं। सामान की सुरक्षा जानकारी के लिए तीन दबाएं। स्क्रैप बेचने के लिए चार दबाएं। किसी व्यक्ति से बात करने के लिए नौ दबाएं।",
    "Press one for today's price. Press two to find the nearest recycler. " +
      "Press three for material safety information. Press four to sell scrap. " +
      "Press nine to talk to a person."
  ),
  askMaterialForPrice: t(
    "किस सामान का भाव सुनना है?",
    "Which material's price would you like to hear?"
  ),
  askMaterialForRecycler: t(
    "आप किस सामान के लिए रीसाइक्लर ढूंढ रहे हैं?",
    "Which material do you want to find a recycler for?"
  ),
  askMaterialForSafety: t(
    "किस सामान की सुरक्षा जानकारी चाहिए?",
    "Which material do you want safety information about?"
  ),
  askMaterialForSale: t(
    "आप क्या सामान बेचना चाहते हैं?",
    "What material would you like to sell?"
  ),
  materialMenu: t(
    "पीसीबी के लिए एक, तांबे के लिए दो, बैटरी के लिए तीन, केबल के लिए चार, एलसीडी या टीवी के लिए पांच, मोटर के लिए छह, मिले-जुले धातु के लिए सात दबाएं।",
    "Press one for PCB, two for copper, three for battery, four for cable, " +
      "five for LCD or TV, six for motor, seven for mixed metal."
  ),
  askPincode: t(
    "अपना छह अंकों का पिन कोड दबाएं और फिर हैश दबाएं।",
    "Please enter your 6-digit PIN code, then press hash."
  ),
  invalidPincode: t(
    "यह पिन कोड सही नहीं लग रहा। कृपया छह अंकों का पिन कोड दोबारा दबाएं।",
    "That doesn't look like a valid PIN code. Please enter the 6-digit code again."
  ),
  askWeight: t(
    "आपके पास कितना वज़न है? किलोग्राम में नंबर दबाएं, फिर हैश दबाएं।",
    "How much weight do you have? Enter the number in kilograms, then press hash."
  ),
  invalidWeight: t(
    "यह वज़न सही नहीं लग रहा। कृपया किलोग्राम में नंबर दबाएं।",
    "That doesn't look like a valid weight. Please enter the number of kilograms."
  ),
  confirmSalePrompt: t(
    "रेफरेंस कोड लेने के लिए एक दबाएं। रद्द करने के लिए दो दबाएं।",
    "Press one to get your reference code. Press two to cancel."
  ),
  saleCancelled: t(
    "ठीक है, कोई रिकॉर्ड नहीं बनाया गया। धन्यवाद।",
    "Okay, no record was created. Thank you for calling."
  ),
  callbackRequested: t(
    "आपका अनुरोध दर्ज कर लिया गया है। हमारी टीम आपको जल्द ही कॉल करेगी। धन्यवाद।",
    "Your request has been noted. Our team will call you back soon. Thank you."
  ),
  goodbye: t(
    "कबाड़ीवाला कनेक्ट इस्तेमाल करने के लिए धन्यवाद।",
    "Thank you for using Kabadiwala Connect."
  )
};

// Spoken labels for each menu material, keyed the same way whatsappService's
// categoryAliases normalizes them, so both channels stay in sync.
export const MATERIAL_MENU = [
  { digit: "1", category: "PCB", label: t("पीसीबी", "PCB") },
  { digit: "2", category: "copper", label: t("तांबा", "copper") },
  { digit: "3", category: "batteries", label: t("बैटरी", "battery") },
  { digit: "4", category: "cables", label: t("केबल", "cable") },
  { digit: "5", category: "LCD", label: t("एलसीडी या टीवी", "LCD or TV") },
  { digit: "6", category: "motors", label: t("मोटर", "motor") },
  { digit: "7", category: "metal", label: t("मिले-जुले धातु", "mixed metal") }
];

export const materialForDigit = (digit) => MATERIAL_MENU.find((option) => option.digit === digit) || null;

export const priceLine = (lang, materialLabel, rangeText) =>
  ({
    hi: `${materialLabel} का आज का भाव ${rangeText} रुपये प्रति किलो है।`,
    en: `Today's rate for ${materialLabel} is ${rangeText} rupees per kilo.`
  }[lang]);

export const recyclerLine = (lang, recyclerName, rating, address) =>
  ({
    hi: `सबसे नज़दीकी रीसाइक्लर है ${recyclerName}, रेटिंग ${rating} में से 5। पता: ${address}।`,
    en: `The nearest recycler is ${recyclerName}, rated ${rating} out of 5. Address: ${address}.`
  }[lang]);

export const noRecyclerLine = t(
  "माफ़ कीजिए, इस सामान के लिए कोई अधिकृत रीसाइक्लर अभी सूचीबद्ध नहीं है।",
  "Sorry, there's no authorized recycler listed for this material yet."
);

export const saleEstimateLine = (lang, weight, materialLabel, amountText) =>
  ({
    hi: `${weight} किलो ${materialLabel} की कीमत लगभग ${amountText} रुपये है।`,
    en: `${weight} kilos of ${materialLabel} is worth approximately ${amountText} rupees.`
  }[lang]);

export const referenceCodeLine = (lang, spelledOutCode) =>
  ({
    hi: `आपका रेफरेंस कोड है: ${spelledOutCode}। यह कोड रीसाइक्लर को दिखाएं।`,
    en: `Your reference code is: ${spelledOutCode}. Please show this code to the recycler.`
  }[lang]);

export const safetyLine = (lang, materialLabel) =>
  ({
    hi: `${materialLabel} को संभालते समय: इसे जलाएं नहीं, तोड़ें नहीं, और सीधी धूप से दूर रखें।`,
    en: `When handling ${materialLabel}: do not burn it, do not break it open, and keep it away from direct heat.`
  }[lang]);

export const confirmPincodeLine = (lang, spelledDigits) =>
  ({
    hi: `आपने दर्ज किया: ${spelledDigits}। सही है तो एक दबाएं। फिर से डालने के लिए दो दबाएं।`,
    en: `You entered: ${spelledDigits}. If that's correct, press one. To enter it again, press two.`
  }[lang]);

// Breaks a reference code like "KB4F92A1" into individual characters separated by
// pauses, so Twilio's TTS reads each one out instead of trying to pronounce it as a word.
export const spellOutCode = (code = "") => String(code).split("").join(", ");