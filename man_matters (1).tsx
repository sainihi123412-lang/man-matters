import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlarmClock,
  ArrowDown,
  ArrowUpRight,
  Bell,
  Bot,
  Camera,
  Check,
  CircleCheck,
  Clock3,
  Columns2,
  ExternalLink,
  LogOut,
  PackageCheck,
  Pill,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const SafeCircleCheck = CircleCheck || Check;

/**
 * Helper utilities
 */
function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysRemaining(tracker) {
  if (!tracker.daily_dose || tracker.daily_dose <= 0) return 0;
  return Math.floor(tracker.gummies_remaining / tracker.daily_dose);
}

function isLowOnStock(tracker) {
  return daysRemaining(tracker) <= tracker.reorder_threshold;
}

/**
 * Man Matters Product Knowledge Base & Offline Fallback for Sahil AI
 */
const MAN_MATTERS_CATALOG = [
  {
    keywords: ["biotin", "hair gummy", "hair gummies", "gummy", "gummies", "hair fall", "hairfall", "hair growth"],
    title: "Biotin Hair Gummies (5000 mcg)",
    summary:
      "Sugar-free strawberry gummies enriched with 5000 mcg Biotin, Zinc, and Vitamins A, C & E to strengthen hair follicles, reduce breakage, and support thicker hair growth. Take 1 gummy daily after a meal; visible results typically start in 8–12 weeks.",
  },
  {
    keywords: ["redensyl", "anagain", "tonic", "serum", "hair tonic", "regrowth"],
    title: "Redensyl + Anagain Hair Growth Tonic",
    summary:
      "Non-greasy water-based scalp serum with 3% Redensyl, 4% Anagain, and Baicapil that reactivates dormant hair stem cells without minoxidil side effects. Apply 1 ml directly to the scalp at night and massage gently.",
  },
  {
    keywords: ["minoxidil", "stage", "bald", "receding", "hairline", "crown"],
    title: "Minoxidil 5% Topical Solution (Alcohol-Free)",
    summary:
      "Clinically proven vasodilator for Stage 2–4 male pattern hair loss. Improves blood flow to shrunken hair follicles to regrow thicker strands. Apply 1 ml twice daily on a dry scalp.",
  },
  {
    keywords: ["shilajit", "ashwagandha", "energy", "stamina", "stress", "testosterone", "gym", "performance"],
    title: "Ashwagandha & Shilajit Gummies / Resin",
    summary:
      "Formulated with pure Himalayan Shilajit (75%+ Fulvic Acid) and KSM-66 Ashwagandha to boost daily stamina, muscle recovery, and cortisol balance. Take 1–2 gummies daily after breakfast or pre-workout.",
  },
  {
    keywords: ["beard", "patchy", "derma", "roller", "oil"],
    title: "Beard Growth Oil + 0.5mm Derma Roller",
    summary:
      "Combines Redensyl and Argan oil with a 540-titanium-needle 0.5mm derma roller to stimulate blood circulation and fill patchy beard areas. Roll twice a week and apply beard oil daily.",
  },
  {
    keywords: ["sleep", "melatonin", "insomnia", "rest"],
    title: "Melatonin Sleep Gummies (5 mg)",
    summary:
      "Non-habit-forming sleep gummies with 5 mg Melatonin, Chamomile, and L-Theanine to help you fall asleep faster and wake up refreshed. Take 1 gummy 30 minutes before bedtime.",
  },
  {
    keywords: ["acv", "apple cider", "weight", "gut", "digestion", "bloating", "metabolism"],
    title: "Apple Cider Vinegar (ACV) Gummies",
    summary:
      "Made with unfiltered ACV ('The Mother'), Vitamin B6 & B12 to support gut health, curb cravings, and aid healthy weight management without acidic aftertaste. Take 1–2 gummies before meals.",
  },
];

function generateSahilFallbackReply(query, userContext) {
  const q = query.toLowerCase();
  const matches = MAN_MATTERS_CATALOG.filter((item) =>
    item.keywords.some((kw) => q.includes(kw))
  );

  if (matches.length > 0) {
    const details = matches
      .slice(0, 2)
      .map((m) => `• ${m.title}: ${m.summary}`)
      .join("\n\n");
    return `Here is what you should know from the Man Matters catalog:\n\n${details}\n\nYou're currently on Day ${userContext.journeyDay} with a ${userContext.streak}-day streak—stay consistent for best results!`;
  }

  return `Hi! I'm Sahil AI, your Man Matters product specialist. You currently have ${userContext.trackerCount} active routine(s) and are on Day ${userContext.journeyDay} of your hair journey.\n\nAsk me about Biotin Hair Gummies, Redensyl Hair Tonic, Minoxidil 5%, Ashwagandha & Shilajit, Beard Growth, or Sleep & ACV Gummies!`;
}

const STORAGE_KEYS = {
  SESSION: "man_matters_session_v1",
  TRACKERS: "man_matters_trackers_v1",
  LOGS: "man_matters_logs_v1",
  CHECKUPS: "man_matters_checkups_v1",
};

const emptyForm = {
  product_name: "Biotin Hair Gummies (No Added Sugar)",
  is_custom_product: false,
  gummies_remaining: 30,
  daily_dose: 1,
  reminder_time: "09:00",
  meal_timing: "After meal",
  dose_schedules: [{ time: "09:00", meal: "After meal" }],
  reorder_threshold: 7,
  reorder_url: "https://manmatters.com/dp/biotin-hair-gummies-for-men-no-added-sugar/1718569/",
  reminder_enabled: true,
};

const MAN_MATTERS_GUMMY_PRESETS = [
  {
    name: "Biotin Hair Gummies (No Added Sugar)",
    defaultDose: 1,
    defaultMeal: "After meal",
    defaultTimes: ["09:00"],
    reorderUrl: "https://manmatters.com/dp/biotin-hair-gummies-for-men-no-added-sugar/1718569/",
  },
  {
    name: "Ashwagandha & Pure Himalayan Shilajit Gummies",
    defaultDose: 2,
    defaultMeal: "After meal",
    defaultTimes: ["09:00", "21:00"],
    reorderUrl: "https://manmatters.com/dp/shilajit-ashwagandha-gummies-for-men/1718712/",
  },
  {
    name: "Melatonin + Chamomile Deep Sleep Gummies",
    defaultDose: 1,
    defaultMeal: "After meal",
    defaultTimes: ["22:30"],
    reorderUrl: "https://manmatters.com/dp/melatonin-sleep-gummies-for-men/1718641/",
  },
  {
    name: "Apple Cider Vinegar + L-Carnitine Gummies",
    defaultDose: 2,
    defaultMeal: "Before meal",
    defaultTimes: ["08:30", "13:00"],
    reorderUrl: "https://manmatters.com/dp/apple-cider-vinegar-gummies-for-men/1718655/",
  },
];

const MAN_MATTERS_PRODUCTS = [
  {
    id: "prod-biotin-gummies",
    name: "Biotin Hair Gummies (No Added Sugar)",
    category: "Hair",
    badge: "BESTSELLER",
    actives: "Biotin 5000 mcg · Zinc · Vitamin A, C & E",
    benefit: "Strengthens hair follicles, reduces breakage & boosts keratin production.",
    rating: "4.6",
    reviews: "18.4k",
    price: 499,
    mrp: 599,
    accent: "#388E6C",
    bgTint: "#E3F2EC",
    url: "https://manmatters.com/dp/biotin-hair-gummies-for-men-no-added-sugar/1718569/",
  },
  {
    id: "prod-redensyl-tonic",
    name: "Redensyl + Anagain Hair Growth Tonic",
    category: "Hair",
    badge: "DOCTOR RECOMMENDED",
    actives: "3% Redensyl · 4% Anagain · 2% Baicapil",
    benefit: "Reactivates dormant hair stem cells to improve density without minoxidil side effects.",
    rating: "4.5",
    reviews: "12.1k",
    price: 799,
    mrp: 999,
    accent: "#2A7256",
    bgTint: "#E6F4EE",
    url: "https://manmatters.com/dp/hair-tonic-with-redensyl-anagain-baicapil-for-men/1718595/",
  },
  {
    id: "prod-minoxidil-5",
    name: "Minoxidil 5% Topical Solution (Alcohol-Free)",
    category: "Hair",
    badge: "STAGE 2-3 HAIR LOSS",
    actives: "5% Minoxidil · Procapil · Lipid Base",
    benefit: "Clinically proven vasodilator that widens follicles for thicker regrowth.",
    rating: "4.5",
    reviews: "9.8k",
    price: 699,
    mrp: 849,
    accent: "#1F5D46",
    bgTint: "#E0EFE9",
    url: "https://manmatters.com/dp/minoxidil-5-solution-for-men/1718588/",
  },
  {
    id: "prod-shilajit-gummies",
    name: "Ashwagandha & Pure Himalayan Shilajit Gummies",
    category: "Performance",
    badge: "TOP RATED",
    actives: "Pure Shilajit · KSM-66 Ashwagandha · Safed Musli",
    benefit: "Boosts daily stamina, recovery, energy levels & lowers cortisol stress.",
    rating: "4.7",
    reviews: "14.2k",
    price: 549,
    mrp: 699,
    accent: "#B87D14",
    bgTint: "#FDF2D8",
    url: "https://manmatters.com/dp/shilajit-ashwagandha-gummies-for-men/1718712/",
  },
  {
    id: "prod-beard-kit",
    name: "Beard Growth Oil & 0.5mm Titanium Derma Roller",
    category: "Beard",
    badge: "PATCHY BEARD KIT",
    actives: "Redensyl · Argan Oil · 540 Titanium Needles",
    benefit: "Stimulates micro-circulation and awakens patchy beard follicles.",
    rating: "4.5",
    reviews: "11.3k",
    price: 599,
    mrp: 798,
    accent: "#3A5A4D",
    bgTint: "#E7EFEA",
    url: "https://manmatters.com/dp/beard-growth-kit-with-beard-oil-derma-roller/1718610/",
  },
  {
    id: "prod-ketoconazole-shampoo",
    name: "Anti-Dandruff 2% Ketoconazole Shampoo",
    category: "Hair",
    badge: "SCALP CARE",
    actives: "2% Ketoconazole · Zinc Pyrithione · Aloe Vera",
    benefit: "Eliminates stubborn dandruff flakes and fungal scalp itch from the first wash.",
    rating: "4.6",
    reviews: "15.6k",
    price: 399,
    mrp: 499,
    accent: "#2E775A",
    bgTint: "#E4F3EC",
    url: "https://manmatters.com/dp/anti-dandruff-shampoo-with-ketoconazole-for-men/1718574/",
  },
  {
    id: "prod-sleep-gummies",
    name: "Melatonin + Chamomile Deep Sleep Gummies",
    category: "Wellness & Sleep",
    badge: "NON-HABIT FORMING",
    actives: "Melatonin 5mg · L-Theanine · Chamomile",
    benefit: "Helps you fall asleep faster and wake up refreshed with zero morning grogginess.",
    rating: "4.6",
    reviews: "8.9k",
    price: 449,
    mrp: 549,
    accent: "#4B5D8F",
    bgTint: "#EAEFF9",
    url: "https://manmatters.com/dp/melatonin-sleep-gummies-for-men/1718641/",
  },
  {
    id: "prod-acv-gummies",
    name: "Apple Cider Vinegar + L-Carnitine Gummies",
    category: "Wellness & Sleep",
    badge: "METABOLISM",
    actives: "ACV with Mother · L-Carnitine · Vitamin B12",
    benefit: "Supports gut health, curbs sugar cravings & improves daily metabolism.",
    rating: "4.5",
    reviews: "7.4k",
    price: 499,
    mrp: 599,
    accent: "#C94F32",
    bgTint: "#FDECE7",
    url: "https://manmatters.com/dp/apple-cider-vinegar-gummies-for-men/1718655/",
  },
];

function createSeedData() {
  const now = new Date().toISOString();
  const seedTrackers = [
    {
      id: "tracker-biotin",
      user_id: "demo-user",
      product_name: "Biotin Hair Gummies (No Added Sugar)",
      gummies_remaining: 24,
      daily_dose: 1,
      reminder_time: "09:00",
      meal_timing: "After meal",
      dose_schedules: [{ time: "09:00", meal: "After meal" }],
      reorder_threshold: 7,
      reorder_url: "https://manmatters.com/dp/biotin-hair-gummies-for-men-no-added-sugar/1718569/",
      reminder_enabled: true,
      created_at: now,
    },
    {
      id: "tracker-shilajit",
      user_id: "demo-user",
      product_name: "Ashwagandha & Pure Himalayan Shilajit Gummies",
      gummies_remaining: 6,
      daily_dose: 2,
      reminder_time: "09:00",
      meal_timing: "After meal",
      dose_schedules: [
        { time: "09:00", meal: "After meal" },
        { time: "21:00", meal: "After meal" },
      ],
      reorder_threshold: 7,
      reorder_url: "https://manmatters.com/dp/shilajit-ashwagandha-gummies-for-men/1718712/",
      reminder_enabled: true,
      created_at: now,
    },
  ];

  const seedLogs = [];
  for (let offset = 1; offset <= 3; offset += 1) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const key = localDateKey(d);
    seedTrackers.forEach((t) => {
      seedLogs.push({
        id: `log-${t.id}-${key}`,
        tracker_id: t.id,
        user_id: "demo-user",
        dose_date: key,
        gummies_taken: t.daily_dose,
        created_at: d.toISOString(),
      });
    });
  }

  return { seedTrackers, seedLogs };
}

function generateHairSnapshotSvg(stage = "day1") {
  const configs = {
    day1: {
      bgTop: "#F1F5F3",
      bgBottom: "#E3ECE7",
      skin: "#E6B89C",
      hairColor: "#232A27",
      templeDepth: 56,
      density: 0.48,
      babyHairs: false,
    },
    day14: {
      bgTop: "#EEF6F2",
      bgBottom: "#DCECE4",
      skin: "#E6B89C",
      hairColor: "#1D2622",
      templeDepth: 42,
      density: 0.72,
      babyHairs: true,
    },
    day24: {
      bgTop: "#EAF5EF",
      bgBottom: "#D4E9DF",
      skin: "#E6B89C",
      hairColor: "#16211C",
      templeDepth: 28,
      density: 0.92,
      babyHairs: true,
    },
  };
  const cfg = configs[stage] || configs.day24;

  let strands = "";
  const step = cfg.density > 0.8 ? 5 : cfg.density > 0.65 ? 7 : 10;
  for (let x = 62; x <= 258; x += step) {
    const distFromCenter = Math.abs(x - 160);
    const templeOffset = distFromCenter > 42 ? ((distFromCenter - 42) / 56) * cfg.templeDepth : 0;
    const yStart = 58 + templeOffset * 0.45;
    const yEnd = 112 + templeOffset * 0.55;
    strands += `<path d="M ${x} ${yStart} Q ${x + (x < 160 ? -4 : 4)} ${(yStart + yEnd) / 2} ${x} ${yEnd}" stroke="${cfg.hairColor}" stroke-width="${cfg.density > 0.8 ? 2.4 : 1.9}" stroke-linecap="round" fill="none" opacity="${cfg.density}" />`;
  }

  const babyHairMarkup = cfg.babyHairs
    ? `<g stroke="#388E6C" stroke-width="1.4" stroke-linecap="round" opacity="0.85">
        <path d="M 96 116 Q 93 123 98 126" fill="none" />
        <path d="M 105 113 Q 102 121 107 124" fill="none" />
        <path d="M 215 113 Q 218 121 213 124" fill="none" />
        <path d="M 224 116 Q 227 123 222 126" fill="none" />
      </g>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" width="320" height="220">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${cfg.bgTop}" />
        <stop offset="100%" stop-color="${cfg.bgBottom}" />
      </linearGradient>
    </defs>
    <rect width="320" height="220" fill="url(#bg)" />
    <line x1="160" y1="24" x2="160" y2="196" stroke="#388E6C" stroke-opacity="0.18" stroke-dasharray="4 4" />
    <line x1="48" y1="115" x2="272" y2="115" stroke="#388E6C" stroke-opacity="0.18" stroke-dasharray="4 4" />
    <path d="M 74 195 C 74 130, 82 58, 160 58 C 238 58, 246 130, 246 195 Z" fill="${cfg.skin}" />
    <path d="M 76 135 C 76 74, 108 54, 160 54 C 212 54, 244 74, 244 135 C 232 ${95 + cfg.templeDepth * 0.4}, 212 ${108 + cfg.templeDepth * 0.35}, 192 104 C 175 100, 145 100, 128 104 C 108 108, 88 ${95 + cfg.templeDepth * 0.4}, 76 135 Z" fill="${cfg.hairColor}" opacity="0.88" />
    ${strands}
    ${babyHairMarkup}
    <path d="M 44 48 L 44 34 L 58 34 M 276 48 L 276 34 L 262 34 M 44 176 L 44 190 L 58 190 M 276 176 L 276 190 L 262 190" stroke="#388E6C" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.55" />
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createSeedCheckups() {
  const day1Date = new Date();
  day1Date.setDate(day1Date.getDate() - 23);
  const day14Date = new Date();
  day14Date.setDate(day14Date.getDate() - 10);

  return [
    {
      id: "checkup-day-1",
      dayNumber: 1,
      date: localDateKey(day1Date),
      angle: "Hairline",
      hairFallCount: "50–100 strands",
      thicknessFeel: "Slightly thinner",
      scalpCondition: "Itchy or flaky",
      babyHairs: "None yet",
      note: "Starting Biotin Hair Gummies. Slight recession around both temples.",
      gummiesTakenSoFar: 1,
      imageUrl: generateHairSnapshotSvg("day1"),
      isSimulated: true,
    },
    {
      id: "checkup-day-14",
      dayNumber: 14,
      date: localDateKey(day14Date),
      angle: "Hairline",
      hairFallCount: "20–50 strands",
      thicknessFeel: "Same as before",
      scalpCondition: "Clean & balanced",
      babyHairs: "Fine fuzz",
      note: "Noticeably less shedding in the shower and fine baby hairs along temples.",
      gummiesTakenSoFar: 14,
      imageUrl: generateHairSnapshotSvg("day14"),
      isSimulated: true,
    },
  ];
}

/**
 * Toast Notification Stack Component
 */
function ToastStack({ toasts }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed top-20 right-4 z-50 flex flex-col items-end gap-2 sm:right-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex w-full max-w-xs items-center gap-2.5 rounded-2xl px-4 py-3 text-xs font-semibold shadow-xl transition ${
            toast.type === "error"
              ? "bg-[#C94A38] text-white"
              : toast.type === "info"
              ? "bg-[#1A2B24] text-white"
              : "bg-[#163A2E] text-white"
          }`}
        >
          <span className="shrink-0 text-[#86E3C3]">
            <ShieldCheck size={16} />
          </span>
          <p className="flex-1 leading-snug">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Full-Viewport Responsive Web App Shell
 */
function WebAppShell({ children, toasts }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F4F7F5] text-[#1A2B24]">
      {children}
      <ToastStack toasts={toasts} />
    </div>
  );
}

/**
 * Split-Screen Web Sign In / Sign Up Screen
 */
function SignInScreen({
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  authBusy,
  submitAuth,
  signInWith,
}) {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
      {/* Left Brand Showcase Panel */}
      <div className="flex flex-col justify-between bg-[#163A2E] p-8 text-white sm:p-12 lg:p-16">
        <div className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#388E6C] text-white shadow-sm">
            <ShieldCheck size={20} strokeWidth={2.3} />
          </span>
          <span>
            man<span className="font-normal text-[#A8C4B8]">matters</span>
          </span>
        </div>

        <div className="my-12 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#244E41] px-3.5 py-1.5 text-xs font-bold text-[#86E3C3]">
            <Sparkles size={14} />
            Doctor-Backed Men&apos;s Wellness
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Consistency builds visible results.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[#A8C4B8] sm:text-base">
            Track your daily gummies, topical tonics, low-stock bottle alerts, and visual hair growth checkups in one clean web dashboard.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
            <div>
              <p className="text-xl font-extrabold text-[#86E3C3]">8–12 Wks</p>
              <p className="mt-0.5 text-xs text-[#A8C4B8]">Regimen horizon</p>
            </div>
            <div>
              <p className="text-xl font-extrabold text-[#86E3C3]">Smart Alerts</p>
              <p className="mt-0.5 text-xs text-[#A8C4B8]">Meal-timed doses</p>
            </div>
            <div>
              <p className="text-xl font-extrabold text-[#86E3C3]">Sahil AI</p>
              <p className="mt-0.5 text-xs text-[#A8C4B8]">24/7 specialist</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-[#86E3C3]/75">
          © {new Date().getFullYear()} Man Matters · Your routine and checkup photos remain private in your browser.
        </p>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="flex items-center justify-center bg-[#F4F7F5] p-6 sm:p-12">
        <div className="w-full max-w-md rounded-3xl border border-[#DCE5DF] bg-white p-7 shadow-xl sm:p-9">
          <span className="text-[11px] font-bold tracking-wider text-[#388E6C] uppercase">
            Welcome to Man Matters
          </span>
          <h2 className="mt-1.5 text-2xl font-extrabold text-[#1A2B24]">
            {authMode === "signin" ? "Good to see you." : "Create your regimen account."}
          </h2>
          <p className="mt-1 text-xs text-[#5E736A]">
            {authMode === "signin"
              ? "Sign in to pick up right where you left off. You stay signed in until you log out."
              : "Sign up once to keep your daily routine and progress checkups saved."}
          </p>

          <form onSubmit={submitAuth} className="mt-6 space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-xs font-bold text-[#3E4C59]">
                Email address
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="arjun@manmatters.com"
                className="mt-1.5 w-full rounded-xl border border-[#D5DCE4] bg-[#F7F8FA] px-3.5 py-3 text-sm text-[#141A21] outline-none transition focus:border-[#388E6C] focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="auth-pass" className="block text-xs font-bold text-[#3E4C59]">
                Password
              </label>
              <input
                id="auth-pass"
                type="password"
                autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-xl border border-[#D5DCE4] bg-[#F7F8FA] px-3.5 py-3 text-sm text-[#141A21] outline-none transition focus:border-[#388E6C] focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={authBusy}
              className="w-full rounded-xl bg-[#388E6C] py-3.5 text-xs font-bold text-white shadow-md transition hover:bg-[#2E775A] active:scale-[0.99] disabled:opacity-60"
            >
              {authBusy ? "Please wait…" : authMode === "signin" ? "Sign in to Dashboard" : "Create Account"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] font-bold text-[#83958E]">
            <span className="h-px flex-1 bg-[#E1E6EB]" />
            or continue with
            <span className="h-px flex-1 bg-[#E1E6EB]" />
          </div>

          <button
            type="button"
            onClick={() => signInWith("google")}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#D5DCE4] bg-white py-3 text-xs font-bold text-[#3E4C59] transition hover:bg-[#F4F7F5]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
              <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
              <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
            </svg>
            Continue with Google
          </button>

          <p className="mt-6 text-center text-xs text-[#5E736A]">
            {authMode === "signin" ? "New to Man Matters?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
              className="font-bold text-[#388E6C] underline underline-offset-2"
            >
              {authMode === "signin" ? "Create an account" : "Sign in instead"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Progress & Daily Hair Condition Page Component ("Progress")
 */
function HairCheckupPage({
  today,
  currentJourneyDay,
  primaryGummyName,
  totalGummiesConsumed,
  checkups,
  onAddCheckup,
  onDeleteCheckup,
  showToast,
}) {
  const [selectedAngle, setSelectedAngle] = useState("Hairline");
  const [hairFallCount, setHairFallCount] = useState("20–50 strands");
  const [thicknessFeel, setThicknessFeel] = useState("Same as before");
  const [scalpCondition, setScalpCondition] = useState("Clean & balanced");
  const [babyHairs, setBabyHairs] = useState("Fine fuzz");
  const [note, setNote] = useState("");
  const [customImage, setCustomImage] = useState(null);
  const [compareDayA, setCompareDayA] = useState("1");
  const [compareDayB, setCompareDayB] = useState("14");
  const [sliderPos, setSliderPos] = useState(50);

  const sortedCheckups = useMemo(
    () => [...checkups].sort((a, b) => a.dayNumber - b.dayNumber),
    [checkups]
  );

  const baselineSnapshot = useMemo(() => {
    return (
      sortedCheckups.find((c) => c.dayNumber.toString() === compareDayA) ||
      sortedCheckups[0]
    );
  }, [sortedCheckups, compareDayA]);

  const selectedSnapshot = useMemo(() => {
    return (
      sortedCheckups.find((c) => c.dayNumber.toString() === compareDayB) ||
      sortedCheckups[sortedCheckups.length - 1] ||
      sortedCheckups[0]
    );
  }, [sortedCheckups, compareDayB]);

  const todayLogged = checkups.some((c) => c.date === today);

  function handleCaptureToday(e) {
    e.preventDefault();
    const simulatedSvg = generateHairSnapshotSvg(
      currentJourneyDay > 20 ? "day24" : currentJourneyDay > 10 ? "day14" : "day1"
    );
    const newEntry = {
      id: `checkup-${Date.now()}`,
      dayNumber: currentJourneyDay,
      date: today,
      angle: selectedAngle,
      hairFallCount,
      thicknessFeel,
      scalpCondition,
      babyHairs,
      note:
        note.trim() ||
        `Day ${currentJourneyDay}: Hair fall ${hairFallCount}, thickness feels ${thicknessFeel.toLowerCase()}.`,
      gummiesTakenSoFar: totalGummiesConsumed,
      imageUrl: customImage || simulatedSvg,
      isSimulated: !customImage,
    };
    onAddCheckup(newEntry);
    setCompareDayB(String(currentJourneyDay));
    setNote("");
    setCustomImage(null);
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomImage(event.target?.result);
      showToast("Photo uploaded and ready to save!", "success");
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-[#DCE5DF] pb-5 sm:flex-row sm:items-end">
        <div>
          <span className="rounded-md bg-[#E3F2EC] px-2.5 py-1 text-[11px] font-bold text-[#388E6C]">
            DAY {currentJourneyDay} HAIR JOURNEY
          </span>
          <h1 className="mt-2 text-2xl font-extrabold text-[#1A2B24] sm:text-3xl">
            Hair Growth &amp; Condition Checkup
          </h1>
          <p className="mt-1 text-sm text-[#5E736A]">
            Log daily hair fall, thickness feel, and visual snapshots to track real changes over time.
          </p>
        </div>
        <div className="rounded-2xl border border-[#DCE5DF] bg-white px-4 py-2.5 text-xs font-semibold text-[#3E4C59]">
          Primary Regimen: <strong className="text-[#1A2B24]">{primaryGummyName}</strong> ·{" "}
          <span className="text-[#388E6C]">{totalGummiesConsumed} doses logged</span>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Daily Check-In Questions & Photo Capture */}
        <div className="lg:col-span-6">
          <div className="rounded-3xl border border-[#DCE5DF] bg-white p-5 shadow-2xs sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl font-bold ${
                    todayLogged ? "bg-[#388E6C] text-white" : "bg-[#FDF2D8] text-[#B87D14]"
                  }`}
                >
                  {todayLogged ? <Check size={18} /> : <Camera size={18} />}
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#1A2B24]">
                    {todayLogged ? "Today's checkup is logged" : "Today's Condition & Photo Checkup"}
                  </h2>
                  <p className="text-xs text-[#5E736A]">
                    Answer 4 quick questions to record today&apos;s hair response
                  </p>
                </div>
              </div>
              {todayLogged && (
                <span className="rounded-full bg-[#E3F2EC] px-3 py-1 text-[11px] font-bold text-[#276B50]">
                  LOGGED TODAY
                </span>
              )}
            </div>

            <form onSubmit={handleCaptureToday} className="mt-5 space-y-4 border-t border-[#EAEFEA] pt-5">
              {/* Focus Area */}
              <div>
                <label className="block text-xs font-bold text-[#3E4C59]">1. Photo Focus Area</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {["Hairline", "Crown", "Temples"].map((angle) => (
                    <button
                      key={angle}
                      type="button"
                      onClick={() => setSelectedAngle(angle)}
                      className={`rounded-xl py-2 text-xs font-bold transition ${
                        selectedAngle === angle
                          ? "bg-[#388E6C] text-white shadow-2xs"
                          : "border border-[#DCE5DF] bg-[#F4F7F5] text-[#5E736A] hover:bg-[#EAEFEA]"
                      }`}
                    >
                      {angle}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2: Hair fall today */}
              <div>
                <label className="block text-xs font-bold text-[#3E4C59]">
                  2. Roughly how many strands fell out today?
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {["< 20 strands", "20–50 strands", "50–100 strands", "100+ strands"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setHairFallCount(opt)}
                      className={`rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                        hairFallCount === opt
                          ? "border border-[#388E6C] bg-[#E3F2EC] text-[#163A2E]"
                          : "border border-[#DCE5DF] bg-[#F9FBFA] text-[#5E736A] hover:bg-[#F4F7F5]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 3: Thickness feel */}
              <div>
                <label className="block text-xs font-bold text-[#3E4C59]">
                  3. How does your hair thickness feel compared to last week?
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {["Thicker & fuller", "Same as before", "Slightly thinner"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setThicknessFeel(opt)}
                      className={`rounded-xl px-2.5 py-2 text-center text-xs font-semibold transition ${
                        thicknessFeel === opt
                          ? "border border-[#388E6C] bg-[#E3F2EC] text-[#163A2E]"
                          : "border border-[#DCE5DF] bg-[#F9FBFA] text-[#5E736A] hover:bg-[#F4F7F5]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 4 & 5: Scalp & Baby hairs */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#3E4C59]">4. Scalp Condition</label>
                  <select
                    value={scalpCondition}
                    onChange={(e) => setScalpCondition(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#DCE5DF] bg-[#F9FBFA] px-3 py-2.5 text-xs font-semibold text-[#1A2B24] outline-none focus:border-[#388E6C]"
                  >
                    <option value="Clean & balanced">Clean &amp; balanced</option>
                    <option value="Oily / sweaty">Oily / sweaty</option>
                    <option value="Itchy or flaky">Itchy or flaky</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3E4C59]">5. New Baby Hair Growth</label>
                  <select
                    value={babyHairs}
                    onChange={(e) => setBabyHairs(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#DCE5DF] bg-[#F9FBFA] px-3 py-2.5 text-xs font-semibold text-[#1A2B24] outline-none focus:border-[#388E6C]"
                  >
                    <option value="None yet">None yet</option>
                    <option value="Fine fuzz">Fine fuzz along temples</option>
                    <option value="Visible sprouts">Visible thicker sprouts</option>
                  </select>
                </div>
              </div>

              {/* Optional Observation Note */}
              <div>
                <label className="block text-xs font-bold text-[#3E4C59]">
                  Observation Note <span className="font-normal text-[#72877E]">(optional)</span>
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Less hair on pillow this morning..."
                  className="mt-1.5 w-full rounded-xl border border-[#DCE5DF] bg-[#F9FBFA] px-3.5 py-2.5 text-xs text-[#1A2B24] outline-none focus:border-[#388E6C]"
                />
              </div>

              {/* Snapshot Preview */}
              <div className="relative overflow-hidden rounded-2xl border border-[#DCE5DF] bg-[#F4F7F5]">
                <img
                  src={customImage || generateHairSnapshotSvg(currentJourneyDay > 20 ? "day24" : "day14")}
                  alt="Hair checkup preview"
                  className="mx-auto h-44 w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3.5 py-2.5 text-white">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Day {currentJourneyDay} · {selectedAngle}
                  </span>
                  <span className="text-[10px] text-white/85">
                    {customImage ? "Uploaded photo" : "Guided scan preview"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row">
                <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#DCE5DF] bg-white py-3 text-xs font-bold text-[#485C53] transition hover:bg-[#F4F7F5]">
                  <Upload size={15} />
                  <span>Upload Real Photo</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>

                <button
                  type="submit"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#388E6C] py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#2E775A]"
                >
                  <Camera size={15} />
                  <span>Save Today&apos;s Checkup</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Interactive Before & After Comparison Slider + Timeline */}
        <div className="space-y-6 lg:col-span-6">
          <section className="rounded-3xl border border-[#DCE5DF] bg-white p-5 shadow-2xs sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-[#667B72]">VISUAL COMPARISON</p>
                <h2 className="text-base font-bold text-[#1A2B24]">Before &amp; After Split Slider</h2>
              </div>
              <span className="text-[#388E6C]">
                <Columns2 size={18} />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#5E736A]">BEFORE (BASELINE)</label>
                <select
                  value={compareDayA}
                  onChange={(e) => setCompareDayA(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#DCE5DF] bg-[#F4F7F5] px-3 py-2 text-xs font-semibold text-[#1A2B24] outline-none"
                >
                  {sortedCheckups.map((c) => (
                    <option key={c.id} value={c.dayNumber}>
                      Day {c.dayNumber} ({c.angle})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#5E736A]">AFTER (PROGRESS)</label>
                <select
                  value={compareDayB}
                  onChange={(e) => setCompareDayB(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#DCE5DF] bg-[#F4F7F5] px-3 py-2 text-xs font-semibold text-[#1A2B24] outline-none"
                >
                  {sortedCheckups.map((c) => (
                    <option key={c.id} value={c.dayNumber}>
                      Day {c.dayNumber} ({c.angle})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interactive Split Overlay Viewer */}
            <div className="relative mt-4 h-56 w-full overflow-hidden rounded-2xl border border-[#DCE5DF] bg-[#F4F7F5] select-none">
              <img
                src={selectedSnapshot?.imageUrl}
                alt="After progress"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <img
                src={baselineSnapshot?.imageUrl}
                alt="Before baseline"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              />

              {/* Divider Line */}
              <div
                className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.45)]"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 left-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#1A2B24] text-[10px] font-bold text-white shadow">
                  ↔
                </div>
              </div>

              <span className="absolute top-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white">
                Day {baselineSnapshot?.dayNumber || 1}
              </span>
              <span className="absolute top-3 right-3 rounded-lg bg-[#388E6C] px-2.5 py-1 text-[10px] font-bold text-white">
                Day {selectedSnapshot?.dayNumber || currentJourneyDay}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <span className="text-[11px] font-bold text-[#5E736A]">Slide to compare</span>
              <input
                type="range"
                min={5}
                max={95}
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                aria-label="Compare before and after hair growth"
                className="h-1.5 flex-1 cursor-pointer accent-[#388E6C]"
              />
            </div>
          </section>

          {/* Chronological Checkup Timeline */}
          <section className="rounded-3xl border border-[#DCE5DF] bg-white p-5 shadow-2xs sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1A2B24]">Checkup History &amp; Condition Logs</h2>
              <span className="rounded-full bg-[#F4F7F5] px-3 py-1 text-xs font-bold text-[#5E736A]">
                {sortedCheckups.length} entries
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {sortedCheckups.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#DCE5DF] bg-[#F9FBFA] p-3.5"
                >
                  <div>
                    <div className="relative overflow-hidden rounded-xl border border-[#E1E6EB]">
                      <img
                        src={item.imageUrl}
                        alt={`Day ${item.dayNumber}`}
                        className="h-32 w-full object-cover"
                      />
                      <span className="absolute top-2 left-2 rounded-md bg-[#1A2B24]/85 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                        DAY {item.dayNumber} · {item.angle}
                      </span>
                      {sortedCheckups.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteCheckup(item.id)}
                          className="absolute top-2 right-2 rounded-lg bg-white/90 p-1.5 text-[#5E736A] transition hover:text-[#C94A38]"
                          aria-label="Delete checkup"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {item.hairFallCount && (
                        <span className="rounded-md bg-[#FDF2D8] px-2 py-0.5 text-[10px] font-bold text-[#8A5D0A]">
                          Fall: {item.hairFallCount}
                        </span>
                      )}
                      {item.thicknessFeel && (
                        <span className="rounded-md bg-[#E3F2EC] px-2 py-0.5 text-[10px] font-bold text-[#276B50]">
                          {item.thicknessFeel}
                        </span>
                      )}
                      {item.babyHairs && item.babyHairs !== "None yet" && (
                        <span className="rounded-md bg-[#EAEFF9] px-2 py-0.5 text-[10px] font-bold text-[#3D4E7A]">
                          {item.babyHairs}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-[#485C53]">{item.note}</p>
                  </div>

                  <p className="mt-2.5 border-t border-[#EAEFEA] pt-2 text-[10px] font-semibold text-[#72877E]">
                    Logged on {item.date}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * Products Catalog Web Page Component ("Products")
 */
function ProductsCatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["All", "Hair", "Performance", "Beard", "Wellness & Sleep"];

  const filteredProducts = useMemo(() => {
    return MAN_MATTERS_PRODUCTS.filter((prod) => {
      const matchCat = selectedCategory === "All" || prod.category === selectedCategory;
      const matchQuery =
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.actives.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.benefit.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header + Search */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#DCE5DF] pb-5 md:flex-row md:items-end">
        <div>
          <span className="rounded-md bg-[#E3F2EC] px-2.5 py-1 text-[11px] font-bold text-[#388E6C]">
            OFFICIAL MAN MATTERS STORE
          </span>
          <h1 className="mt-2 text-2xl font-extrabold text-[#1A2B24] sm:text-3xl">
            Doctor-Backed Men&apos;s Solutions
          </h1>
          <p className="mt-1 text-sm text-[#5E736A]">
            Explore clinically evaluated gummies, tonics, and kits—click any product to view on manmatters.com.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <span className="pointer-events-none absolute top-3 left-3.5 text-[#72877E]">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Biotin, Minoxidil, Shilajit..."
            className="w-full rounded-xl border border-[#DCE5DF] bg-white py-2.5 pr-4 pl-10 text-xs font-semibold text-[#1A2B24] shadow-2xs outline-none transition focus:border-[#388E6C]"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              selectedCategory === cat
                ? "bg-[#388E6C] text-white shadow-sm"
                : "border border-[#DCE5DF] bg-white text-[#5E736A] hover:bg-[#EAEFEA]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Responsive 3-Column Product Catalog Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((prod) => (
          <article
            key={prod.id}
            className="flex flex-col justify-between rounded-3xl border border-[#DCE5DF] bg-white p-5 shadow-2xs transition hover:-translate-y-0.5 hover:border-[#388E6C] hover:shadow-md"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider"
                  style={{ backgroundColor: prod.bgTint, color: prod.accent }}
                >
                  {prod.badge}
                </span>
                <div className="flex items-center gap-1 text-xs font-bold text-[#1A2B24]">
                  <Star size={14} className="fill-[#F5B841] text-[#F5B841]" />
                  <span>{prod.rating}</span>
                  <span className="text-[11px] font-normal text-[#72877E]">({prod.reviews})</span>
                </div>
              </div>

              <a
                href={prod.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-base font-bold text-[#1A2B24] transition hover:text-[#388E6C]"
              >
                {prod.name}
              </a>
              <p className="mt-1 text-xs font-semibold text-[#388E6C]">{prod.actives}</p>
              <p className="mt-2 text-xs leading-relaxed text-[#5E736A]">{prod.benefit}</p>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-[#EAEFEA] pt-4">
              <div>
                <span className="text-base font-extrabold text-[#1A2B24]">₹{prod.price}</span>
                <span className="ml-2 text-xs font-medium text-[#72877E] line-through">
                  ₹{prod.mrp}
                </span>
              </div>

              <a
                href={prod.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#388E6C] px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#2E775A]"
              >
                <span>View on Site</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/**
 * Sahil AI Product Specialist Chatbot Popup Component (Web Floating Corner)
 */
function SahilAIChatbot({ trackers, streak, currentJourneyDay }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "m-1",
      sender: "bot",
      text: "Hi! I'm Sahil AI, your Man Matters product specialist. Ask me anything about Biotin gummies, Redensyl hair tonic, Minoxidil 5%, Ashwagandha & Shilajit, or your routine!",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages, isTyping]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    setInput("");
    const userMsg = { id: `m-${Date.now()}`, sender: "user", text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    let botReply = "";
    try {
      const userContext = {
        trackerCount: trackers.length,
        activeProducts: trackers.map((t) => t.product_name).join(", "),
        streak,
        journeyDay: currentJourneyDay,
      };
      botReply = generateSahilFallbackReply(userText, userContext);
    } catch {
      botReply = "I'm here to help with all your Man Matters product and routine questions!";
    }

    await new Promise((r) => setTimeout(r, 400));
    setIsTyping(false);
    setMessages((prev) => [...prev, { id: `m-${Date.now() + 1}`, sender: "bot", text: botReply }]);
  }

  return (
    <>
      {/* Floating Bottom-Right Chat Trigger Button */}
      <div className="fixed right-5 bottom-5 z-40 sm:right-7 sm:bottom-7">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open Sahil AI chatbot"
          className="flex items-center gap-2.5 rounded-full bg-[#163A2E] px-4 py-3.5 text-xs font-bold text-white shadow-2xl transition hover:scale-105 hover:bg-[#1E4D3D] active:scale-95"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#388E6C] text-white">
            {isOpen ? <X size={16} /> : <Bot size={17} />}
          </span>
          <span>{isOpen ? "Close Sahil AI" : "Ask Sahil AI"}</span>
        </button>
      </div>

      {/* Responsive Desktop & Mobile Chat Popup Drawer */}
      {isOpen && (
        <div className="fixed right-4 bottom-22 left-4 z-50 flex h-[460px] flex-col overflow-hidden rounded-3xl border border-[#DCE5DF] bg-white shadow-2xl sm:right-7 sm:bottom-24 sm:left-auto sm:w-96">
          {/* Chat Header */}
          <div className="flex items-center justify-between bg-[#163A2E] px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#244E41] text-[#86E3C3]">
                <Bot size={18} />
              </span>
              <div>
                <p className="text-xs font-bold">Sahil AI</p>
                <p className="text-[10px] text-[#A8C4B8]">Man Matters Product Specialist · Online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      id: "m-1",
                      sender: "bot",
                      text: "Chat reset. What would you like to know about Man Matters products or your routine?",
                    },
                  ])
                }
                title="Reset chat"
                className="rounded-full p-1.5 text-[#A8C4B8] transition hover:bg-white/10 hover:text-white"
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="rounded-full p-1.5 text-[#A8C4B8] transition hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-[#F4F7F5] p-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
                    m.sender === "user"
                      ? "rounded-br-sm bg-[#388E6C] text-white"
                      : "rounded-bl-sm border border-[#DCE5DF] bg-white text-[#1A2B24]"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-[#DCE5DF] bg-white px-3.5 py-2 text-xs text-[#5E736A]">
                  Sahil is typing…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="flex gap-1.5 overflow-x-auto border-t border-[#EAEFEA] bg-white px-3.5 py-2">
            {[
              "Biotin vs Minoxidil?",
              "How to use Redensyl tonic?",
              "Shilajit dosage?",
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setInput(chip)}
                className="shrink-0 rounded-full border border-[#DCE5DF] bg-[#F4F7F5] px-2.5 py-1 text-[10px] font-semibold text-[#485C53] transition hover:bg-[#E3F2EC] hover:text-[#388E6C]"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-[#EAEFEA] bg-white p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Sahil AI about Man Matters..."
              className="flex-1 rounded-xl border border-[#DCE5DF] bg-[#F4F7F5] px-3 py-2 text-xs text-[#1A2B24] outline-none transition focus:border-[#388E6C]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#388E6C] text-white shadow-2xs transition hover:bg-[#2E775A] disabled:opacity-50"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

/**
 * Main Man Matters Web Application
 */
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("arjun@manmatters.com");
  const [password, setPassword] = useState("password123");
  const [authBusy, setAuthBusy] = useState(false);

  const [activeTab, setActiveTab] = useState("routine");
  const [trackers, setTrackers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [checkups, setCheckups] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [today, setToday] = useState(() => localDateKey());
  const [minute, setMinute] = useState(() => new Date().toTimeString().slice(0, 5));
  const [workingId, setWorkingId] = useState(null);
  const [notifications, setNotifications] = useState("unsupported");
  const [toasts, setToasts] = useState([]);

  function showToast(message, type = "success") {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3400);
  }

  useEffect(() => {
    setToday(localDateKey());
    const refreshClock = () => setMinute(new Date().toTimeString().slice(0, 5));
    refreshClock();
    const clock = window.setInterval(refreshClock, 15_000);

    try {
      const savedSession = window.localStorage.getItem(STORAGE_KEYS.SESSION);
      const savedTrackers = window.localStorage.getItem(STORAGE_KEYS.TRACKERS);
      const savedLogs = window.localStorage.getItem(STORAGE_KEYS.LOGS);
      const savedCheckups = window.localStorage.getItem(STORAGE_KEYS.CHECKUPS);

      if (savedSession) {
        setSession(JSON.parse(savedSession));
      } else {
        setSession(null);
      }

      if (savedTrackers && savedLogs) {
        setTrackers(JSON.parse(savedTrackers));
        setLogs(JSON.parse(savedLogs));
      } else {
        const { seedTrackers, seedLogs } = createSeedData();
        setTrackers(seedTrackers);
        setLogs(seedLogs);
        window.localStorage.setItem(STORAGE_KEYS.TRACKERS, JSON.stringify(seedTrackers));
        window.localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(seedLogs));
      }

      if (savedCheckups) {
        setCheckups(JSON.parse(savedCheckups));
      } else {
        const seedCheckups = createSeedCheckups();
        setCheckups(seedCheckups);
        window.localStorage.setItem(STORAGE_KEYS.CHECKUPS, JSON.stringify(seedCheckups));
      }
    } catch {
      const { seedTrackers, seedLogs } = createSeedData();
      setSession(null);
      setTrackers(seedTrackers);
      setLogs(seedLogs);
      setCheckups(createSeedCheckups());
    }

    setAuthLoading(false);
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifications(Notification.permission);
    }

    return () => {
      window.clearInterval(clock);
    };
  }, []);

  useEffect(() => {
    if (!authLoading && session) {
      window.localStorage.setItem(STORAGE_KEYS.TRACKERS, JSON.stringify(trackers));
    }
  }, [trackers, authLoading, session]);

  useEffect(() => {
    if (!authLoading && session) {
      window.localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    }
  }, [logs, authLoading, session]);

  useEffect(() => {
    if (!authLoading && session) {
      window.localStorage.setItem(STORAGE_KEYS.CHECKUPS, JSON.stringify(checkups));
    }
  }, [checkups, authLoading, session]);

  useEffect(() => {
    if (!session?.user?.id || !minute || !today || trackers.length === 0) return;
    for (const tracker of trackers) {
      const reminderTime = tracker.reminder_time ? tracker.reminder_time.slice(0, 5) : "09:00";
      const schedules =
        Array.isArray(tracker.dose_schedules) && tracker.dose_schedules.length > 0
          ? tracker.dose_schedules
          : [{ time: reminderTime, meal: tracker.meal_timing || "After meal" }];

      const matchesMinute = schedules.some((s) => s.time.slice(0, 5) === minute);
      if (
        tracker.reminder_enabled &&
        matchesMinute &&
        !logs.some((log) => log.tracker_id === tracker.id && log.dose_date === today)
      ) {
        notifyOnce(
          `dose-${tracker.id}-${today}-${minute}`,
          `Time for ${tracker.product_name}`,
          `Your ${tracker.daily_dose} unit daily dose is ready.`
        );
      }
      if (isLowOnStock(tracker)) {
        notifyOnce(
          `stock-${tracker.id}-${today}`,
          `${tracker.product_name} is running low`,
          `About ${daysRemaining(tracker)} days left. Reorder on Man Matters soon.`
        );
      }
    }
  }, [session?.user?.id, minute, today, trackers, logs, notifications]);

  const dosesToday = useMemo(
    () =>
      trackers.filter((tracker) =>
        logs.some((log) => log.tracker_id === tracker.id && log.dose_date === today)
      ).length,
    [trackers, logs, today]
  );

  const streak = useMemo(() => {
    let count = 0;
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = localDateKey(date);
      if (
        trackers.length > 0 &&
        trackers.every((tracker) =>
          logs.some((log) => log.tracker_id === tracker.id && log.dose_date === key)
        )
      ) {
        count += 1;
      } else {
        if (offset === 0) continue;
        break;
      }
    }
    return count;
  }, [trackers, logs]);

  const totalGummiesConsumed = useMemo(() => {
    const loggedSum = logs.reduce((acc, log) => acc + (log.gummies_taken || 1), 0);
    return Math.max(loggedSum, 21);
  }, [logs]);

  const currentJourneyDay = useMemo(() => {
    if (checkups.length === 0) return 1;
    const earliest = [...checkups].sort((a, b) => a.dayNumber - b.dayNumber)[0];
    const start = new Date(`${earliest.date}T12:00:00`);
    const now = new Date();
    const diffDays = Math.max(1, Math.round((now.getTime() - start.getTime()) / 86_400_000) + earliest.dayNumber);
    return diffDays;
  }, [checkups]);

  async function submitAuth(event) {
    event.preventDefault();
    setAuthBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    const trimmedEmail = email.trim() || "arjun@manmatters.com";
    const nextSession = {
      user: {
        id: "demo-user",
        email: trimmedEmail,
      },
    };
    window.localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(nextSession));
    setSession(nextSession);
    setAuthBusy(false);
    showToast(authMode === "signup" ? "Your Man Matters account is ready." : "Welcome back to Man Matters.");
  }

  async function signInWith(provider) {
    const nextSession = {
      user: {
        id: "demo-user",
        email: provider === "google" ? "arjun.sharma@gmail.com" : "arjun@manmatters.com",
      },
    };
    window.localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(nextSession));
    setSession(nextSession);
    showToast(`Signed in with ${provider === "google" ? "Google" : "Man Matters"}.`);
  }

  function signOut() {
    window.localStorage.removeItem(STORAGE_KEYS.SESSION);
    setSession(null);
    showToast("You’re signed out.", "info");
  }

  function notifyOnce(key, title, body) {
    if (notifications !== "granted" || typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const storageKey = `man-matters:${session?.user?.id}:${key}`;
      if (window.localStorage.getItem(storageKey) === "sent") return;
      new Notification(title, { body });
      window.localStorage.setItem(storageKey, "sent");
    } catch {
      // Notification blocked or failed
    }
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setNotifications("unsupported");
      showToast("Browser notifications aren't supported in this preview frame.", "info");
      return;
    }
    if (window.top !== window.self) {
      showToast("Reminders are active in-app! Open in a full tab for OS-level alerts.", "info");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifications(permission);
    if (permission === "granted") {
      showToast("Alerts are on while Man Matters is open.");
    } else {
      showToast("Allow notifications in your browser settings.", "info");
    }
  }

  function openAddDialog(tracker: any = null) {
    setEditing(tracker ?? null);
    if (tracker) {
      const matchedPreset = MAN_MATTERS_GUMMY_PRESETS.find(
        (preset) => preset.name.toLowerCase() === tracker.product_name.toLowerCase()
      );
      const doseCount = Math.max(1, Number(tracker.daily_dose) || 1);
      const reminderTime = tracker.reminder_time ? tracker.reminder_time.slice(0, 5) : "09:00";
      const existingSchedules = Array.isArray(tracker.dose_schedules) && tracker.dose_schedules.length > 0
        ? tracker.dose_schedules
        : Array.from({ length: doseCount }, (_, idx) => ({
            time: idx === 0 ? reminderTime : "21:00",
            meal: tracker.meal_timing || "After meal",
          }));

      setForm({
        product_name: tracker.product_name,
        is_custom_product: !matchedPreset,
        gummies_remaining: tracker.gummies_remaining,
        daily_dose: doseCount,
        reminder_time: reminderTime,
        meal_timing: tracker.meal_timing || "After meal",
        dose_schedules: existingSchedules,
        reorder_threshold: tracker.reorder_threshold ?? 7,
        reorder_url: tracker.reorder_url ?? "",
        reminder_enabled: tracker.reminder_enabled ?? true,
      });
    } else {
      setForm(emptyForm);
    }
    setDialogOpen(true);
  }

  function handleSelectProductPreset(selectedValue) {
    if (selectedValue === "__custom__") {
      setForm((prev) => ({
        ...prev,
        is_custom_product: true,
        product_name: "",
        reorder_url: "https://manmatters.com",
      }));
      return;
    }

    const preset = MAN_MATTERS_GUMMY_PRESETS.find((item) => item.name === selectedValue);
    if (!preset) return;

    const nextSchedules = Array.from({ length: preset.defaultDose }, (_, idx) => ({
      time: preset.defaultTimes[idx] || (idx === 0 ? "09:00" : idx === 1 ? "21:00" : "14:00"),
      meal: preset.defaultMeal,
    }));

    setForm((prev) => ({
      ...prev,
      is_custom_product: false,
      product_name: preset.name,
      daily_dose: preset.defaultDose,
      reminder_time: nextSchedules[0].time,
      meal_timing: preset.defaultMeal,
      dose_schedules: nextSchedules,
      reorder_url: preset.reorderUrl,
    }));
  }

  function handleDailyDoseChange(rawCount) {
    const count = Math.max(1, Math.min(10, Number(rawCount) || 1));
    setForm((prev) => {
      const currentSchedules = Array.isArray(prev.dose_schedules) ? prev.dose_schedules : [];
      const defaultTimes = ["09:00", "21:00", "14:00", "18:00"];
      const nextSchedules = Array.from({ length: count }, (_, idx) => {
        if (currentSchedules[idx]) return currentSchedules[idx];
        return {
          time: idx === 0 ? prev.reminder_time || "09:00" : defaultTimes[idx % defaultTimes.length],
          meal: prev.meal_timing || "After meal",
        };
      });
      return {
        ...prev,
        daily_dose: count,
        reminder_time: nextSchedules[0]?.time || prev.reminder_time,
        meal_timing: nextSchedules[0]?.meal || prev.meal_timing,
        dose_schedules: nextSchedules,
      };
    });
  }

  function updateDoseScheduleItem(index, field, value) {
    setForm((prev) => {
      const currentList = Array.isArray(prev.dose_schedules) ? prev.dose_schedules : [];
      const updated = currentList.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      );
      return {
        ...prev,
        dose_schedules: updated,
        reminder_time: updated[0]?.time || prev.reminder_time || "09:00",
        meal_timing: updated[0]?.meal || prev.meal_timing || "After meal",
      };
    });
  }

  async function saveTracker(event) {
    event.preventDefault();
    if (!session?.user?.id) return;
    if (!form.product_name.trim()) {
      showToast("Please select a product or enter a custom name.", "error");
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 200));

    const schedules = Array.isArray(form.dose_schedules) ? form.dose_schedules : [];
    const normalizedSchedules = Array.from({ length: form.daily_dose }, (_, idx) => ({
      time: schedules[idx]?.time || form.reminder_time || "09:00",
      meal: schedules[idx]?.meal || form.meal_timing || "After meal",
    }));

    const values = {
      ...form,
      product_name: form.product_name.trim(),
      reorder_url: form.reorder_url?.trim() || null,
      reminder_time: normalizedSchedules[0].time,
      meal_timing: normalizedSchedules[0].meal,
      dose_schedules: normalizedSchedules,
    };

    if (editing) {
      setTrackers((current) =>
        current.map((item) => (item.id === editing.id ? { ...item, ...values } : item))
      );
      showToast("Product routine updated.");
    } else {
      const newTracker = {
        ...values,
        id: `tracker-${Date.now()}`,
        user_id: session.user.id,
        created_at: new Date().toISOString(),
      };
      setTrackers((current) => [...current, newTracker]);
      showToast("Product added to your routine.");
    }

    setSaving(false);
    setDialogOpen(false);
  }

  async function logDose(tracker) {
    if (!session?.user?.id || !today) return;
    const alreadyTaken = logs.some((log) => log.tracker_id === tracker.id && log.dose_date === today);

    if (alreadyTaken) {
      setLogs((current) =>
        current.filter((log) => !(log.tracker_id === tracker.id && log.dose_date === today))
      );
      setTrackers((current) =>
        current.map((item) =>
          item.id === tracker.id
            ? { ...item, gummies_remaining: item.gummies_remaining + tracker.daily_dose }
            : item
        )
      );
      showToast("Dose check-off undone.", "info");
      return;
    }

    if (tracker.gummies_remaining < tracker.daily_dose) {
      showToast("Not enough units left for a full dose. Update your bottle count first.", "error");
      return;
    }

    setWorkingId(tracker.id);
    await new Promise((r) => setTimeout(r, 180));

    const newLog = {
      id: `log-${Date.now()}`,
      tracker_id: tracker.id,
      user_id: session.user.id,
      dose_date: today,
      gummies_taken: tracker.daily_dose,
      created_at: new Date().toISOString(),
    };

    setTrackers((current) =>
      current.map((item) =>
        item.id === tracker.id
          ? { ...item, gummies_remaining: Math.max(0, item.gummies_remaining - tracker.daily_dose) }
          : item
      )
    );
    setLogs((current) => [newLog, ...current]);
    setWorkingId(null);
    showToast("Dose checked off. Keep your streak alive!");
  }

  function deleteTracker(tracker) {
    setTrackers((current) => current.filter((item) => item.id !== tracker.id));
    setLogs((current) => current.filter((log) => log.tracker_id !== tracker.id));
    setDialogOpen(false);
    showToast("Product removed from routine.", "info");
  }

  function handleAddCheckup(newEntry) {
    setCheckups((prev) => [newEntry, ...prev]);
    showToast(`Day ${newEntry.dayNumber} checkup saved!`);
  }

  function handleDeleteCheckup(id) {
    setCheckups((prev) => prev.filter((item) => item.id !== id));
    showToast("Checkup entry removed.", "info");
  }

  function resetDemoData() {
    const { seedTrackers, seedLogs } = createSeedData();
    const seedCheckups = createSeedCheckups();
    setTrackers(seedTrackers);
    setLogs(seedLogs);
    setCheckups(seedCheckups);
    window.localStorage.setItem(STORAGE_KEYS.TRACKERS, JSON.stringify(seedTrackers));
    window.localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(seedLogs));
    window.localStorage.setItem(STORAGE_KEYS.CHECKUPS, JSON.stringify(seedCheckups));
    showToast("Demo routine & progress data restored.", "info");
  }

  if (authLoading) {
    return (
      <WebAppShell toasts={toasts}>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-[#388E6C] text-white shadow-md">
            <ShieldCheck size={24} />
          </div>
        </div>
      </WebAppShell>
    );
  }

  if (!session) {
    return (
      <WebAppShell toasts={toasts}>
        <SignInScreen
          authMode={authMode}
          setAuthMode={setAuthMode}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          authBusy={authBusy}
          submitAuth={submitAuth}
          signInWith={signInWith}
        />
      </WebAppShell>
    );
  }

  const lowTrackers = trackers.filter(isLowOnStock);
  const expectedDoses = trackers.length;

  return (
    <WebAppShell toasts={toasts}>
      {/* Sticky Widescreen Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-[#DCE5DF] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Brand Logo -> Lands on Routine Home */}
          <button
            type="button"
            onClick={() => setActiveTab("routine")}
            className="inline-flex cursor-pointer items-center gap-2.5 text-lg font-extrabold tracking-tight text-[#1A2B24] transition hover:opacity-80"
            aria-label="Man Matters home — go to Routine"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#388E6C] text-white shadow-2xs">
              <ShieldCheck size={18} strokeWidth={2.3} />
            </span>
            <span>
              man<span className="font-normal text-[#566B62]">matters</span>
            </span>
          </button>

          {/* Desktop Center Navigation Tabs */}
          <nav
            aria-label="Primary web navigation"
            className="hidden items-center gap-1.5 rounded-2xl bg-[#F4F7F5] p-1 md:flex"
          >
            <button
              type="button"
              onClick={() => setActiveTab("routine")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "routine"
                  ? "bg-white text-[#388E6C] shadow-2xs"
                  : "text-[#5E736A] hover:text-[#1A2B24]"
              }`}
            >
              <Pill size={15} />
              <span>Routine</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("progress")}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "progress"
                  ? "bg-white text-[#388E6C] shadow-2xs"
                  : "text-[#5E736A] hover:text-[#1A2B24]"
              }`}
            >
              <Camera size={15} />
              <span>Progress</span>
              {!checkups.some((c) => c.date === today) && (
                <span className="h-2 w-2 rounded-full bg-[#E86F52]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("products")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "products"
                  ? "bg-white text-[#388E6C] shadow-2xs"
                  : "text-[#5E736A] hover:text-[#1A2B24]"
              }`}
            >
              <ShoppingBag size={15} />
              <span>Products</span>
            </button>
          </nav>

          {/* Top Bar Right Utility Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetDemoData}
              title="Reset sample data"
              aria-label="Reset sample data"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DCE5DF] bg-white text-[#566B62] transition hover:bg-[#F4F7F5]"
            >
              <RotateCcw size={15} />
            </button>

            <button
              type="button"
              onClick={() => void enableNotifications()}
              aria-label="Enable notifications"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE5DF] bg-white px-3 text-xs font-semibold text-[#1A2B24] transition hover:bg-[#F4F7F5]"
            >
              <Bell size={14} className={notifications === "granted" ? "text-[#388E6C]" : ""} />
              <span className="hidden sm:inline">
                {notifications === "granted" ? "Alerts on" : "Alerts"}
              </span>
            </button>

            <div className="flex items-center gap-2 rounded-full border border-[#DCE5DF] bg-[#F4F7F5] py-1 pr-1.5 pl-3">
              <span className="hidden max-w-[140px] truncate text-xs font-medium text-[#566B62] lg:inline">
                {session.user.email}
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E3F2EC] text-xs font-bold text-[#276B50]">
                {session.user.email?.slice(0, 1).toUpperCase() ?? "M"}
              </span>
              <button
                type="button"
                onClick={signOut}
                aria-label="Sign out"
                title="Sign out"
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#566B62] transition hover:bg-[#FCECE8] hover:text-[#B54434]"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <nav
          aria-label="Mobile web navigation"
          className="grid grid-cols-3 border-t border-[#EAEFEA] bg-white px-2 py-1.5 md:hidden"
        >
          <button
            type="button"
            onClick={() => setActiveTab("routine")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === "routine" ? "bg-[#E3F2EC] text-[#388E6C]" : "text-[#72877E]"
            }`}
          >
            <Pill size={14} />
            <span>Routine</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("progress")}
            className={`relative flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === "progress" ? "bg-[#E3F2EC] text-[#388E6C]" : "text-[#72877E]"
            }`}
          >
            <Camera size={14} />
            <span>Progress</span>
            {!checkups.some((c) => c.date === today) && (
              <span className="h-2 w-2 rounded-full bg-[#E86F52]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === "products" ? "bg-[#E3F2EC] text-[#388E6C]" : "text-[#72877E]"
            }`}
          >
            <ShoppingBag size={14} />
            <span>Products</span>
          </button>
        </nav>
      </header>

      {/* Main Page View */}
      <main className="flex-1 pb-24">
        {activeTab === "progress" ? (
          <HairCheckupPage
            today={today}
            currentJourneyDay={currentJourneyDay}
            primaryGummyName={trackers[0]?.product_name || "Biotin Hair Gummies"}
            totalGummiesConsumed={totalGummiesConsumed}
            checkups={checkups}
            onAddCheckup={handleAddCheckup}
            onDeleteCheckup={handleDeleteCheckup}
            showToast={showToast}
          />
        ) : activeTab === "products" ? (
          <ProductsCatalogPage />
        ) : (
          <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            {/* Welcome Header & Primary Add Products CTA */}
            <section className="flex flex-col justify-between gap-4 border-b border-[#DCE5DF] pb-6 sm:flex-row sm:items-end">
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#566B62]">
                  <span className="inline-flex text-[#F5B841]">
                    <Sun size={14} />
                  </span>
                  Consistency builds results
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1A2B24] sm:text-3xl">
                  Your daily wellness rhythm<span className="text-[#388E6C]">.</span>
                </h1>
                <p className="mt-1 text-sm text-[#5E736A]">
                  {today
                    ? new Intl.DateTimeFormat("en", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      }).format(new Date(`${today}T12:00:00`))
                    : "Your daily wellness routine."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => openAddDialog()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A2B24] px-5 py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#273E34] active:scale-[0.98]"
              >
                <span className="inline-flex text-[#F5B841]">
                  <Plus size={16} />
                </span>
                Add products
              </button>
            </section>

            {trackers.length === 0 ? (
              <section className="rounded-3xl border border-[#DCE5DF] bg-white p-8 text-center shadow-2xs sm:p-12">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E3F2EC] text-[#388E6C]">
                  <Sparkles size={24} />
                </div>
                <h2 className="mt-4 text-xl font-bold text-[#1A2B24]">
                  Start your daily wellness habit.
                </h2>
                <p className="mx-auto mt-1.5 max-w-md text-sm text-[#5E736A]">
                  Add your Man Matters gummies, hair tonics, or supplements to track doses and get low-stock alerts before running out.
                </p>
                <button
                  type="button"
                  onClick={() => openAddDialog()}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#388E6C] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#2E775A]"
                >
                  <Plus size={16} />
                  Add products
                </button>
              </section>
            ) : (
              <>
                {/* 3-Column KPI Overview Strip */}
                <section
                  aria-label="Your routine overview"
                  className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                >
                  <div className="flex items-center gap-3.5 rounded-2xl border border-[#DCE5DF] bg-white p-4 shadow-2xs">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E3F2EC] text-[#276B50]">
                      <SafeCircleCheck size={20} />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold tracking-wider text-[#667B72]">TODAY&apos;S PROGRESS</p>
                      <p className="mt-0.5 text-xl font-extrabold text-[#1A2B24]">
                        {dosesToday}
                        <span className="text-sm font-medium text-[#667B72]"> / {expectedDoses} done</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 rounded-2xl border border-[#DCE5DF] bg-white p-4 shadow-2xs">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FDF2D8] text-[#B87D14]">
                      <Sparkles size={20} />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold tracking-wider text-[#667B72]">CURRENT STREAK</p>
                      <p className="mt-0.5 text-xl font-extrabold text-[#1A2B24]">
                        {streak}
                        <span className="text-sm font-medium text-[#667B72]">
                          {" "}
                          {streak === 1 ? "day" : "days"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 rounded-2xl border border-[#DCE5DF] bg-white p-4 shadow-2xs">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FCECE8] text-[#C94F32]">
                      <PackageCheck size={20} />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold tracking-wider text-[#667B72]">BOTTLE SUPPLY</p>
                      <p className="mt-0.5 text-xl font-extrabold text-[#1A2B24]">
                        {lowTrackers.length
                          ? `${lowTrackers.length} running low`
                          : "All well stocked"}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Low-Stock Alert Banner */}
                {lowTrackers.length > 0 && (
                  <section className="flex items-center justify-between gap-4 rounded-2xl border border-[#F5D6CE] bg-[#FDF6F4] p-4 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FCE5DF] text-[#C94F32]">
                        <PackageCheck size={20} />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[#9C331C]">
                          Low supply alert — reorder soon
                        </p>
                        <p className="mt-0.5 text-xs text-[#6B4A43]">
                          {lowTrackers
                            .map(
                              (tracker) =>
                                `${tracker.product_name} (${daysRemaining(tracker)} ${
                                  daysRemaining(tracker) === 1 ? "day" : "days"
                                } left)`
                            )
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                    <span className="hidden text-[#C94F32] sm:inline">
                      <ArrowDown size={16} />
                    </span>
                  </section>
                )}

                {/* Main 2-Column Web Dashboard Layout */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  {/* Left 8 Columns: Active Product Routine Cards */}
                  <section className="space-y-4 lg:col-span-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold tracking-wider text-[#667B72]">
                          THE DAILY DOSE
                        </p>
                        <h2 className="text-lg font-bold text-[#1A2B24]">Active Regimen</h2>
                      </div>
                      <span className="rounded-full bg-[#E3F2EC] px-3 py-1 text-xs font-bold text-[#276B50]">
                        {trackers.length.toString().padStart(2, "0")}{" "}
                        {trackers.length === 1 ? "PRODUCT" : "PRODUCTS"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {trackers.map((tracker, index) => {
                        const taken = logs.some(
                          (log) => log.tracker_id === tracker.id && log.dose_date === today
                        );
                        const days = daysRemaining(tracker);
                        const low = isLowOnStock(tracker);
                        const fill = Math.min(
                          100,
                          (tracker.gummies_remaining /
                            Math.max(tracker.gummies_remaining + tracker.daily_dose * 10, 1)) *
                            100
                        );

                        return (
                          <article
                            key={tracker.id}
                            className={`flex flex-col justify-between rounded-3xl border p-5 transition ${
                              taken
                                ? "border-[#BFE3D3] bg-[#F1F9F5]"
                                : "border-[#DCE5DF] bg-white shadow-2xs hover:border-[#388E6C]/50"
                            }`}
                          >
                            <div>
                              {/* Card Header */}
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${
                                      taken
                                        ? "bg-[#388E6C] text-white"
                                        : "border border-[#DCE5DF] bg-[#F4F7F5] text-[#485C53]"
                                    }`}
                                  >
                                    {taken ? (
                                      <Check size={16} />
                                    ) : (
                                      (index + 1).toString().padStart(2, "0")
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-bold tracking-wider text-[#667B72]">
                                      {tracker.reminder_enabled ? "DAILY REGIMEN" : "ROUTINE"}
                                    </span>
                                    <h3 className="text-sm font-bold text-[#1A2B24]">
                                      {tracker.product_name}
                                    </h3>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => openAddDialog(tracker)}
                                  aria-label={`Edit ${tracker.product_name}`}
                                  title="Edit routine"
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#72877E] transition hover:bg-[#EAEFEA] hover:text-[#1A2B24]"
                                >
                                  <Settings2 size={16} />
                                </button>
                              </div>

                              {/* Dosage & Meal Schedule Badges */}
                              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-[#5E736A]">
                                <span className="inline-flex items-center gap-1 font-semibold text-[#3E4C59]">
                                  <Clock3 size={13} />
                                  {tracker.daily_dose}{" "}
                                  {tracker.daily_dose === 1 ? "unit/day" : "units/day"}
                                </span>
                                {Array.isArray(tracker.dose_schedules) &&
                                tracker.dose_schedules.length > 0 ? (
                                  tracker.dose_schedules.map((sched, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className="rounded-lg bg-[#E3F2EC] px-2 py-0.5 text-[11px] font-semibold text-[#276B50]"
                                    >
                                      #{sIdx + 1} · {sched.time.slice(0, 5)} ({sched.meal})
                                    </span>
                                  ))
                                ) : (
                                  <span className="rounded-lg bg-[#E3F2EC] px-2 py-0.5 text-[11px] font-semibold text-[#276B50]">
                                    {tracker.reminder_time ? tracker.reminder_time.slice(0, 5) : "09:00"} ({tracker.meal_timing || "After meal"})
                                  </span>
                                )}
                              </div>

                              {/* Bottle Supply Progress Bar */}
                              <div className="mt-4">
                                <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
                                  <span className="text-[#667B72]">
                                    {tracker.gummies_remaining} units left in bottle
                                  </span>
                                  <span className={low ? "text-[#C94F32]" : "text-[#388E6C]"}>
                                    {days} {days === 1 ? "day" : "days"} left
                                  </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-[#E6ECE9]">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      low ? "bg-[#E86F52]" : "bg-[#388E6C]"
                                    }`}
                                    style={{ width: `${fill}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Action Footer */}
                            <div className="mt-4 flex items-center gap-2 border-t border-[#EAEFEA] pt-3.5">
                              <button
                                type="button"
                                onClick={() => void logDose(tracker)}
                                disabled={workingId === tracker.id}
                                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition active:scale-[0.98] ${
                                  taken
                                    ? "border border-[#B6DEC9] bg-[#DCF2E7] text-[#22664B] hover:bg-[#CFEAD9]"
                                    : "bg-[#388E6C] text-white shadow-2xs hover:bg-[#2E775A]"
                                }`}
                              >
                                <Check size={15} />
                                {workingId === tracker.id
                                  ? "Saving…"
                                  : taken
                                  ? "Taken today (Undo)"
                                  : "Take dose"}
                              </button>

                              {tracker.reorder_url && low && (
                                <a
                                  href={tracker.reorder_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-xl border border-[#F5C6BA] bg-white px-3.5 py-2.5 text-xs font-bold text-[#B54434] transition hover:bg-[#FCECE8]"
                                >
                                  Reorder <ArrowUpRight size={14} />
                                </a>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>

                  {/* Right 4 Columns: Weekly Consistency & Reminders Sidebar */}
                  <aside className="space-y-4 lg:col-span-4">
                    {/* 7-Day Consistency Calendar */}
                    <div className="rounded-3xl border border-[#DCE5DF] bg-white p-5 shadow-2xs">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold tracking-wider text-[#667B72]">
                            CONSISTENCY
                          </p>
                          <h2 className="text-base font-bold text-[#1A2B24]">Last 7 Days</h2>
                        </div>
                        <span className="rounded-full bg-[#E3F2EC] px-2.5 py-1 text-xs font-bold text-[#276B50]">
                          {
                            logs.filter((log) =>
                              trackers.some((tracker) => tracker.id === log.tracker_id)
                            ).length
                          }{" "}
                          doses
                        </span>
                      </div>

                      <div className="grid grid-cols-7 gap-1.5 text-center">
                        {Array.from({ length: 7 }, (_, offset) => {
                          const date = new Date();
                          date.setDate(date.getDate() - (6 - offset));
                          const key = localDateKey(date);
                          const complete =
                            trackers.length > 0 &&
                            trackers.every((tracker) =>
                              logs.some(
                                (log) => log.tracker_id === tracker.id && log.dose_date === key
                              )
                            );
                          const partial = logs.some(
                            (log) =>
                              log.dose_date === key &&
                              trackers.some((tracker) => tracker.id === log.tracker_id)
                          );

                          return (
                            <div key={key} className="flex flex-col items-center gap-1.5">
                              <span className="text-[10px] font-bold text-[#72877E]">
                                {new Intl.DateTimeFormat("en", { weekday: "narrow" }).format(date)}
                              </span>
                              <span
                                className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition ${
                                  complete
                                    ? "bg-[#388E6C] text-white shadow-2xs"
                                    : partial
                                    ? "border border-[#388E6C] bg-[#E3F2EC] text-[#276B50]"
                                    : "border border-[#E1E6EB] bg-[#F9FBFA] text-[#566B62]"
                                }`}
                              >
                                {complete ? (
                                  <Check size={14} />
                                ) : partial ? (
                                  <span className="h-2 w-2 rounded-full bg-[#388E6C]" />
                                ) : (
                                  <span>{date.getDate()}</span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Smart Reminders Info Card */}
                    <div className="rounded-3xl border border-[#DCE5DF] bg-white p-5 shadow-2xs">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FDF2D8] text-[#B87D14]">
                          <AlarmClock size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1A2B24]">
                            Meal-Timed Reminders
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-[#5E736A]">
                            We notify you right at each scheduled gummy or tonic dose time while your dashboard is open.
                          </p>
                          <button
                            type="button"
                            onClick={() => void enableNotifications()}
                            className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-[#388E6C] underline underline-offset-2"
                          >
                            {notifications === "granted"
                              ? "Browser alerts are active"
                              : "Enable browser desktop alerts"}
                            <ArrowUpRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Hair Progress Callout */}
                    <div className="rounded-3xl bg-[#163A2E] p-5 text-white shadow-sm">
                      <span className="rounded-md bg-[#244E41] px-2 py-0.5 text-[10px] font-bold text-[#86E3C3]">
                        DAY {currentJourneyDay} CHECK-IN
                      </span>
                      <h3 className="mt-2 text-sm font-bold">
                        Track your hair fall &amp; thickness today
                      </h3>
                      <p className="mt-1 text-xs text-[#A8C4B8]">
                        Compare before &amp; after hairline photos and log today&apos;s strand count.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("progress")}
                        className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-[#388E6C] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#2E775A]"
                      >
                        <span>Open Progress Checkup</span>
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </aside>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Sahil AI Floating Product Specialist Chatbot */}
      <SahilAIChatbot
        trackers={trackers}
        streak={streak}
        currentJourneyDay={currentJourneyDay}
      />

      {/* Centered Responsive Web Modal Dialog for Adding / Editing Products */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2B24]/55 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#DCE5DF] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E3F2EC] text-[#388E6C]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1A2B24]">
                    {editing ? "Edit product routine" : "Add product to routine"}
                  </h2>
                  <p className="text-xs text-[#5E736A]">
                    Select a Man Matters product or add your own with custom meal timings.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                aria-label="Close modal"
                className="rounded-full p-1.5 text-[#72877E] hover:bg-[#F4F7F5]"
              >
                <X size={18} />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={(event) => void saveTracker(event)}>
              <div>
                <label
                  htmlFor="product-select"
                  className="block text-xs font-bold text-[#3E4C59]"
                >
                  Select Man Matters Product
                </label>
                <select
                  id="product-select"
                  value={form.is_custom_product ? "__custom__" : form.product_name}
                  onChange={(event) => handleSelectProductPreset(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#D5DCE4] bg-[#F7F8FA] px-3.5 py-2.5 text-xs font-semibold text-[#141A21] outline-none transition focus:border-[#388E6C]"
                >
                  {MAN_MATTERS_GUMMY_PRESETS.map((preset) => (
                    <option key={preset.name} value={preset.name}>
                      {preset.name}
                    </option>
                  ))}
                  <option value="__custom__">+ Add your own</option>
                </select>

                {form.is_custom_product && (
                  <div className="mt-2.5">
                    <label
                      htmlFor="custom-product-name"
                      className="block text-[11px] font-bold text-[#5E736A]"
                    >
                      Custom product name
                    </label>
                    <input
                      id="custom-product-name"
                      autoFocus
                      maxLength={80}
                      required
                      value={form.product_name}
                      onChange={(event) =>
                        setForm({ ...form, product_name: event.target.value })
                      }
                      placeholder="e.g. Redensyl Hair Tonic or Multivitamin"
                      className="mt-1 w-full rounded-xl border border-[#388E6C] bg-white px-3.5 py-2.5 text-xs text-[#141A21] outline-none transition"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="stock-count"
                    className="block text-xs font-bold text-[#3E4C59]"
                  >
                    Units in bottle
                  </label>
                  <input
                    id="stock-count"
                    type="number"
                    min={0}
                    max={10000}
                    required
                    value={form.gummies_remaining}
                    onChange={(event) =>
                      setForm({ ...form, gummies_remaining: Number(event.target.value) })
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#D5DCE4] bg-[#F7F8FA] px-3.5 py-2.5 text-xs text-[#141A21] outline-none transition focus:border-[#388E6C]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="daily-dose"
                    className="block text-xs font-bold text-[#3E4C59]"
                  >
                    Units per day
                  </label>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleDailyDoseChange(num)}
                        className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition ${
                          form.daily_dose === num
                            ? "bg-[#388E6C] text-white shadow-2xs"
                            : "border border-[#D5DCE4] bg-[#F7F8FA] text-[#485C53] hover:bg-[#EAEFEA]"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <input
                      id="daily-dose"
                      type="number"
                      min={1}
                      max={10}
                      required
                      aria-label="Custom daily dose"
                      value={form.daily_dose}
                      onChange={(event) => handleDailyDoseChange(event.target.value)}
                      className="w-12 rounded-xl border border-[#D5DCE4] bg-[#F7F8FA] px-1.5 py-2.5 text-center text-xs font-bold text-[#141A21] outline-none transition focus:border-[#388E6C]"
                    />
                  </div>
                </div>
              </div>

              {/* Single Dose vs Separate Per-Dose Timings & Before/After Meal Selection */}
              {form.daily_dose === 1 ? (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="reminder-time"
                      className="block text-xs font-bold text-[#3E4C59]"
                    >
                      Reminder time
                    </label>
                    <input
                      id="reminder-time"
                      type="time"
                      required
                      value={form.dose_schedules[0]?.time || form.reminder_time}
                      onChange={(event) =>
                        updateDoseScheduleItem(0, "time", event.target.value)
                      }
                      className="mt-1.5 w-full rounded-xl border border-[#D5DCE4] bg-[#F7F8FA] px-3.5 py-2.5 text-xs text-[#141A21] outline-none transition focus:border-[#388E6C]"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-[#3E4C59]">Meal timing</span>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      {["Before meal", "After meal"].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateDoseScheduleItem(0, "meal", option)}
                          className={`rounded-xl py-2.5 text-[11px] font-bold transition ${
                            (form.dose_schedules[0]?.meal || form.meal_timing) === option
                              ? "bg-[#388E6C] text-white shadow-2xs"
                              : "border border-[#D5DCE4] bg-[#F7F8FA] text-[#485C53] hover:bg-[#EAEFEA]"
                          }`}
                        >
                          {option === "Before meal" ? "Before" : "After"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 rounded-2xl border border-[#DCE5DF] bg-[#F9FBFA] p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-wide text-[#276B50]">
                      SEPARATE DOSE SCHEDULE ({form.daily_dose} UNITS)
                    </span>
                    <span className="text-[10px] font-semibold text-[#667B72]">
                      Time &amp; meal preference
                    </span>
                  </div>

                  <div className="max-h-40 space-y-2 overflow-y-auto pr-0.5">
                    {form.dose_schedules.map((sched, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-xl border border-[#E1E6EB] bg-white p-2"
                      >
                        <span className="w-16 shrink-0 text-[11px] font-bold text-[#3E4C59]">
                          Dose #{idx + 1}
                        </span>
                        <input
                          type="time"
                          required
                          aria-label={`Dose ${idx + 1} reminder time`}
                          value={sched.time}
                          onChange={(event) =>
                            updateDoseScheduleItem(idx, "time", event.target.value)
                          }
                          className="w-24 rounded-lg border border-[#D5DCE4] bg-[#F7F8FA] px-2 py-1.5 text-[11px] font-semibold text-[#141A21] outline-none focus:border-[#388E6C]"
                        />
                        <div className="flex flex-1 gap-1">
                          {["Before meal", "After meal"].map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => updateDoseScheduleItem(idx, "meal", option)}
                              className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold transition ${
                                sched.meal === option
                                  ? "bg-[#388E6C] text-white"
                                  : "bg-[#F4F7F5] text-[#5E736A] hover:bg-[#EAEFEA]"
                              }`}
                            >
                              {option === "Before meal" ? "Before" : "After"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reorder-threshold"
                    className="block text-xs font-bold text-[#3E4C59]"
                  >
                    Low-stock warning (days left)
                  </label>
                  <input
                    id="reorder-threshold"
                    type="number"
                    min={0}
                    max={365}
                    required
                    value={form.reorder_threshold}
                    onChange={(event) =>
                      setForm({ ...form, reorder_threshold: Number(event.target.value) })
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#D5DCE4] bg-[#F7F8FA] px-3.5 py-2.5 text-xs text-[#141A21] outline-none transition focus:border-[#388E6C]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reorder-url"
                    className="block text-xs font-bold text-[#3E4C59]"
                  >
                    Man Matters reorder link
                  </label>
                  <input
                    id="reorder-url"
                    type="url"
                    maxLength={2048}
                    value={form.reorder_url ?? ""}
                    onChange={(event) =>
                      setForm({ ...form, reorder_url: event.target.value })
                    }
                    placeholder="https://manmatters.com"
                    className="mt-1.5 w-full rounded-xl border border-[#D5DCE4] bg-[#F7F8FA] px-3.5 py-2.5 text-xs text-[#141A21] outline-none transition focus:border-[#388E6C]"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#DCE5DF] bg-[#F9FBFA] p-3.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FDF2D8] text-[#B87D14]">
                  <Bell size={15} />
                </span>
                <span className="flex-1">
                  <strong className="block text-xs font-bold text-[#1A2B24]">
                    Enable daily reminders
                  </strong>
                  <small className="text-[11px] text-[#5E736A]">
                    {(form.dose_schedules || []).length > 1
                      ? `${form.dose_schedules.length} reminders (${form.dose_schedules
                          .map((s) => `${s.time} ${s.meal === "Before meal" ? "before" : "after"}`)
                          .join(", ")})`
                      : `At ${(form.dose_schedules && form.dose_schedules[0]?.time) || form.reminder_time || "09:00"} (${
                          (form.dose_schedules && form.dose_schedules[0]?.meal) || form.meal_timing || "After meal"
                        })`}
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={form.reminder_enabled}
                  onChange={(event) =>
                    setForm({ ...form, reminder_enabled: event.target.checked })
                  }
                  aria-label="Enable daily reminder"
                  className="h-4 w-4 accent-[#388E6C]"
                />
              </label>

              <div className="flex items-center justify-end gap-2.5 border-t border-[#EAEFEA] pt-4">
                {editing && (
                  <button
                    type="button"
                    onClick={() => deleteTracker(editing)}
                    className="mr-auto inline-flex items-center gap-1 rounded-xl border border-[#F5C6BA] px-3.5 py-2.5 text-xs font-bold text-[#B54434] transition hover:bg-[#FCECE8]"
                  >
                    <X size={14} /> Remove
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-xl border border-[#DCE5DF] bg-white px-4 py-2.5 text-xs font-bold text-[#485C53] transition hover:bg-[#F4F7F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#388E6C] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#2E775A] disabled:opacity-60"
                >
                  {saving ? "Saving…" : editing ? "Save changes" : "Add product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </WebAppShell>
  );
}