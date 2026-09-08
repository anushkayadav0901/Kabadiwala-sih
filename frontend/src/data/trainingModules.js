// ---------------------------------------------------------------------------
// COLLECTOR TRAINING CURRICULUM
//
// Capacity-building content for informal collectors, per PS 26229. Ships with
// the app bundle rather than the API so every lesson works with no connectivity.
//
// Written for limited-literacy readers: short sentences, concrete numbers, one
// idea per card. Every safety claim traces to CPCB guidance or the E-Waste
// (Management) Rules, 2022.
// ---------------------------------------------------------------------------

export const MODULES = [
  {
    id: "materials",
    title: "Know Your Materials",
    subtitle: "Identify the seven scrap types that matter",
    icon: "🔍",
    color: "#2a78d6",
    minutes: 6,
    lessons: [
      {
        heading: "Circuit boards are the gold mine",
        body: "The green boards inside phones, computers and TVs are called PCBs. They hold real gold, silver and copper on their contact pins. A single kilo can be worth ₹400 to ₹900 — more than any other scrap you carry.",
        tip: "Never break a PCB into pieces. Whole boards fetch a higher rate than broken ones.",
      },
      {
        heading: "Cables are steady money",
        body: "Copper wiring pays around ₹150 to ₹200 per kilo. Thicker cables hold more copper inside the plastic. House wiring and appliance cords are both worth collecting.",
        tip: "Coil cables neatly. Buyers pay more when they can see the quantity clearly.",
      },
      {
        heading: "Batteries need careful handling",
        body: "Lithium batteries from phones and laptops contain lithium and cobalt — both are on India's critical minerals list. They pay around ₹95 per kilo, but only to recyclers licensed to accept them.",
        tip: "A swollen or puffed-up battery is dangerous. Keep it separate in a metal or clay container.",
      },
      {
        heading: "Motors hide copper windings",
        body: "Fans, washing machines and mixers all contain motors. Inside every motor is a tightly wound copper coil. Whole motors pay around ₹45 to ₹190 per kilo depending on size.",
        tip: "Strong magnets inside motors can wipe phone cards. Keep motors away from your phone.",
      },
      {
        heading: "Screens: know LCD from CRT",
        body: "Flat screens are LCD or LED — these pay around ₹50 to ₹120 per kilo. Old heavy box TVs are CRT. CRT glass contains lead and pays very little, around ₹8 per kilo, but it must still go to a licensed recycler.",
        tip: "Never break a CRT tube. The lead dust inside is poisonous and the vacuum can implode.",
      },
      {
        heading: "Mixed plastics still count",
        body: "Keyboards, mouse bodies and printer casings are mostly plastic. The rate is low — around ₹20 per kilo — but the weight adds up quickly across a full day of collection.",
        tip: "Plastic that has been burned cannot be recycled and buyers will refuse it.",
      },
    ],
    quiz: [
      {
        q: "Which material usually pays you the most per kilogram?",
        options: ["Mixed plastics", "Circuit boards (PCBs)", "CRT glass", "Cardboard"],
        answer: 1,
        why: "PCBs contain gold, silver and copper on their contacts, making them the highest-value scrap a collector carries.",
      },
      {
        q: "You find a phone battery that looks swollen. What should you do?",
        options: [
          "Press it flat so it fits in the bag",
          "Put it with the other batteries",
          "Keep it separate in a metal or clay container",
          "Leave it in the sun to dry",
        ],
        answer: 2,
        why: "A swollen battery can catch fire. Isolating it in a non-flammable container is the safe handling step.",
      },
      {
        q: "An old heavy box-shaped television is which category?",
        options: ["LCD panel", "CRT display", "Mixed plastic", "Motor assembly"],
        answer: 1,
        why: "Box-shaped televisions use cathode ray tubes. CRT glass contains lead and needs licensed disposal.",
      },
    ],
  },

  {
    id: "safety",
    title: "Work Safe, Earn Longer",
    subtitle: "The practices that protect your health",
    icon: "🛡️",
    color: "#e34948",
    minutes: 5,
    lessons: [
      {
        heading: "Never burn cables",
        body: "Burning plastic off wire releases dioxins — poisons that stay in your lungs and in the soil for years. It also blackens the copper, and buyers pay less for burnt copper than clean copper.",
        tip: "Strip cables with a blade or sell them whole. Burning costs you both health and money.",
        severity: "critical",
      },
      {
        heading: "Never open batteries",
        body: "Battery acid burns skin and eyes on contact. Lithium cells can catch fire the moment air reaches the inside. There is nothing valuable inside a battery that you can safely remove yourself.",
        tip: "Sell batteries sealed and whole. That is what licensed recyclers want anyway.",
        severity: "critical",
      },
      {
        heading: "Never use acid on circuit boards",
        body: "Acid stripping to pull gold off boards releases toxic fumes and leaves you handling strong acid without protection. It also destroys the other metals in the board, lowering the total value.",
        tip: "A whole board sold to a formal recycler pays more than the gold you could recover by hand.",
        severity: "critical",
      },
      {
        heading: "Cover your hands and face",
        body: "Sharp metal edges, broken glass and fine dust are the three daily hazards. Thick gloves and a cloth mask cost very little and prevent most injuries and breathing problems.",
        tip: "Wash your hands before eating. Metal dust on food is a slow poison.",
        severity: "warning",
      },
      {
        heading: "Watch the microwave capacitor",
        body: "The large capacitor inside a microwave oven holds a lethal electrical charge even when the appliance has been unplugged for months. It can kill.",
        tip: "Sell microwaves whole. Never open the metal casing.",
        severity: "critical",
      },
      {
        heading: "Store away from where you sleep",
        body: "E-waste gives off dust and fumes. Keeping it inside the house exposes your family, especially children, to lead and mercury.",
        tip: "Keep collected material in a separate covered area, not in living or sleeping space.",
        severity: "warning",
      },
    ],
    quiz: [
      {
        q: "Why should you never burn cable insulation?",
        options: [
          "It takes too much time",
          "It releases poisons and lowers the copper's value",
          "It is only allowed at night",
          "It makes the copper too heavy",
        ],
        answer: 1,
        why: "Burning releases dioxins that damage your lungs, and buyers pay less for burnt copper than clean copper.",
      },
      {
        q: "Which part of a microwave oven can kill even when unplugged?",
        options: ["The glass plate", "The door handle", "The high-voltage capacitor", "The plastic casing"],
        answer: 2,
        why: "The capacitor stores a lethal charge for months after the appliance is disconnected from power.",
      },
      {
        q: "What is the safest way to handle circuit boards?",
        options: [
          "Use acid to extract the gold",
          "Burn off the plastic parts first",
          "Sell them whole to a licensed recycler",
          "Crush them into small pieces",
        ],
        answer: 2,
        why: "Whole boards sold formally pay more than hand-recovered gold, without exposing you to acid or toxic fumes.",
      },
    ],
  },

  {
    id: "pricing",
    title: "Get the Right Price",
    subtitle: "Never be underpaid again",
    icon: "⚖️",
    color: "#1baf7a",
    minutes: 5,
    lessons: [
      {
        heading: "Check the rate before you sell",
        body: "The price board in this app shows the live market rate for every material, updated from real scrap markets. Open it before you reach the buyer, not after.",
        tip: "Tap the speaker icon on the price board to hear the rate spoken aloud.",
      },
      {
        heading: "Weigh before you leave",
        body: "Enter your weight in the app and it calculates what the lot is worth. Now you know the number before the buyer names one. That single fact changes the whole conversation.",
        tip: "If the buyer's scale shows much less than yours, ask them to weigh it again in front of you.",
      },
      {
        heading: "Sort before you sell",
        body: "A mixed bag gets a mixed-bag price — usually the rate of the cheapest item in it. Separating circuit boards from plastics can raise your total by 30% or more for the same collection.",
        tip: "Keep three separate bags: high value, cables and metal, and low-value plastics.",
      },
      {
        heading: "Know when a price is wrong",
        body: "This app checks every deal against the market range automatically. If an offer is far below fair value, you get a warning before the handover is completed.",
        tip: "A buyer who refuses to let you check the rate is usually not offering a fair one.",
      },
      {
        heading: "Do not depend on one buyer",
        body: "When you sell everything to a single buyer, they set the price. Selling to two or three different recyclers keeps rates competitive and gives you a fallback.",
        tip: "The Nearby Recyclers screen ranks buyers by the rate they actually offer for your material.",
      },
    ],
    quiz: [
      {
        q: "Why should you sort materials before selling?",
        options: [
          "It looks more professional",
          "Mixed bags get priced at the cheapest item's rate",
          "The buyer requires it by law",
          "It reduces the total weight",
        ],
        answer: 1,
        why: "Unsorted lots are priced down to the lowest-value material in them. Sorting can raise your total by 30% or more.",
      },
      {
        q: "When should you check the market rate?",
        options: [
          "After the buyer names a price",
          "Before you reach the buyer",
          "Only at the end of the month",
          "Only when selling circuit boards",
        ],
        answer: 1,
        why: "Knowing the fair rate before negotiating means the buyer's offer is measured against a number you already hold.",
      },
      {
        q: "What is the risk of always selling to the same buyer?",
        options: [
          "It takes longer to travel",
          "They can set the price because you have no alternative",
          "The app will stop working",
          "You pay more tax",
        ],
        answer: 1,
        why: "A single buyer controls your rate. Multiple buyers compete, which keeps prices fair.",
      },
    ],
  },

  {
    id: "epr",
    title: "Formal Recycling & EPR",
    subtitle: "Why the paper trail pays you",
    icon: "📋",
    color: "#4a3aa7",
    minutes: 5,
    lessons: [
      {
        heading: "What EPR means for you",
        body: "Extended Producer Responsibility is a law that makes companies who sell electronics responsible for collecting them back. Under the E-Waste Rules 2022, they must prove how much they collected — and they need collectors like you to hit those targets.",
        tip: "Your documented collection is worth more to a producer than an undocumented one.",
      },
      {
        heading: "Authorized recyclers pay properly",
        body: "A recycler with CPCB registration can legally issue receipts and claim EPR credit. That is why they can afford to pay fair rates. Unregistered buyers cannot, so they pay less and keep no record.",
        tip: "This app shows a verification badge on every CPCB-registered recycler.",
      },
      {
        heading: "The handover pass is your proof",
        body: "Every handover creates a digital pass with a photo, weight, GPS location, timestamp and a unique reference number. The recycler scans it to confirm. That record cannot be altered afterwards.",
        tip: "Keep your handover references. They are proof of income and of work history.",
      },
      {
        heading: "Your record builds standing",
        body: "A collector with months of documented handovers has something the informal system never gave them: verifiable proof of earnings. That record is what makes formal credit, insurance and government schemes reachable.",
        tip: "The Earnings screen is your digital passbook. It never gets lost like a paper notebook.",
      },
      {
        heading: "Critical minerals matter nationally",
        body: "Lithium, cobalt and rare earth elements recovered from e-waste reduce how much India must import. The Ministry of Mines treats this as a resource security priority — which is why formal recovery carries bonuses.",
        tip: "Lots containing batteries or motors may qualify for a critical mineral bonus in this app.",
      },
    ],
    quiz: [
      {
        q: "What does EPR require electronics companies to do?",
        options: [
          "Pay tax on every product sold",
          "Collect back and recycle a share of what they sell",
          "Open a shop in every district",
          "Give free repairs for two years",
        ],
        answer: 1,
        why: "Extended Producer Responsibility makes producers accountable for collecting and recycling their products after use.",
      },
      {
        q: "Why can CPCB-registered recyclers pay better rates?",
        options: [
          "They receive a government salary",
          "They can legally claim EPR credit for what they collect",
          "They have larger godowns",
          "They do not pay for transport",
        ],
        answer: 1,
        why: "Registered recyclers can issue valid receipts and claim EPR credit, which funds the better rate they offer you.",
      },
      {
        q: "What makes your handover record valuable to you personally?",
        options: [
          "It reduces the weight you carry",
          "It is verifiable proof of your earnings and work history",
          "It gives a discount on transport",
          "It is required to buy a phone",
        ],
        answer: 1,
        why: "A documented earnings history is what makes formal credit, insurance and government schemes accessible.",
      },
    ],
  },
];

export const PROGRESS_KEY = "kabadi_training_progress";

export const loadProgress = () => {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  } catch {
    return {};
  }
};

export const saveProgress = (progress) => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // A collector in private-browsing mode still gets the lessons; only the
    // completion badge is lost.
  }
};

export const TOTAL_QUESTIONS = MODULES.reduce((sum, m) => sum + m.quiz.length, 0);
