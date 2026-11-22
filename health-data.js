/* ─── Health Data ─── */
/*  ⚠️  MOCK DATA — everything below is hard-coded.
 *
 *  This is the ONLY place the dashboard gets its numbers from.
 *  To wire up real sources later, keep the shapes below identical and
 *  replace the values (Oura for sleep, a wearable for heart rate and
 *  activity, manual weight and lab entries).
 *
 *  Nothing here talks to a network. There is no API and no backend.
 */

/**
 * @typedef {Object} Profile
 * @property {string} name       Avatar name shown in the top bar.
 * @property {number} level      Current level.
 * @property {number} xp         XP earned toward the next level.
 * @property {number} xpToNext   XP needed to reach the next level.
 */

/**
 * @typedef {Object} Category
 * @property {string} id      "vitality" | "power" | "recovery".
 *                            Also selects the avatar image: the hero loads
 *                            img/avatar-<id>.png for each category.
 * @property {string} label   Display name.
 * @property {number} score   0–100. Drives the ring, the band and the colour.
 * @property {string} detail  Two or three neutral, observational sentences.
 *                            State what the number is and what moved —
 *                            no verdicts, no instructions.
 *                            NOT currently rendered: the panels show data
 *                            only. Retained for when copy generation lands.
 */

/**
 * @typedef {Object} Marker
 * @property {string} label            Short caption.
 * @property {?(number|string)} value  null renders as a muted em-dash.
 * @property {string} [suffix]         Appended to a non-null value.
 */

/**
 * @typedef {Object} HealthData
 * @property {Profile} profile
 * @property {Category[]} categories  Three, in left-to-right display order.
 * @property {Object} body            Not scored and not colour-graded.
 */

/** @type {HealthData} */
const HEALTH_DATA = {
  profile: {
    name: "Sherif",
    level: 7,
    xp: 765,
    xpToNext: 1200,
  },

  /* Order here is the order on screen, left to right. */
  categories: [
    {
      id: "vitality",
      /* Resting heart rate vs personal baseline, stress, and daily
         activity (steps + active calories). 7-day rolling. */
      label: "Vitality",
      score: 88,
      detail:
        "Resting heart rate averaged 58 bpm over the last seven days, 2 bpm below your baseline. " +
        "Daily activity came to 8,100 steps and 480 active calories. " +
        "Stress readings sat in the low range on five of the seven days.",
    },
    {
      id: "power",
      /* Training sessions completed vs 4 planned per week, plus
         training load trend. 7-day rolling. */
      label: "Power",
      score: 71,
      detail:
        "Three of four planned sessions were completed this week. " +
        "Training load is running 12% above the previous seven-day block. " +
        "The most recent session was lower body, two days ago.",
    },
    {
      id: "recovery",
      /* Sleep duration vs a 7h target (~70%), sleep score (~30%),
         and bedtime consistency. 7-day average. */
      label: "Recovery",
      score: 66,
      detail:
        "Sleep averaged 6h 20m against the 7h target. " +
        "Sleep score averaged 74, six points lower than the previous week. " +
        "Bedtime moved across a 1h 40m range over the seven nights.",
    },
  ],

  /* ── BODY ──
     Deliberately unscored: no band, no colour, no status label.
     These update when a new reading arrives, not every day.
     Any value may be null — it renders as a muted em-dash, never a zero. */
  body: {
    weight: { start: 92.4, current: 88.1, goal: 82.0, unit: "kg" },
    markers: [
      { label: "BMI", value: 27.4 },
      { label: "Body Fat", value: 24.1, suffix: "%" },
      { label: "Cardio Age", value: 34, suffix: " yrs" },
      { label: "Blood Panel", value: "14 Sep" },
    ],
  },

  /* ── SLEEP ──
     Shown when RECOVERY is selected. Last night, not a 7-day average.
     The main bar's total is derived from the stages below, so the two
     can never disagree. "Awake" is time in bed, not time asleep — it is
     excluded from the total but included in the stacked bar. */
  sleep: {
    scaleMinHours: 1.5,
    scaleMaxHours: 12,
    targetHours: 7,
    /* 180 nights: 90 for the longest window plus 90 more so that window
       has a previous period to compare against. */
    nights: mockNights(180),
  },

  /* ── TRAINING ──
     Shown when POWER is selected. Inferred shape: the brief referred to
     a spec note that was not included, so this mirrors the numbers in
     the Power narrative. Swap it freely. */
  training: {
    sessionsCompleted: 3,
    sessionsPlanned: 4,
    metrics: [
      { label: "Sessions", value: "3 / 4" },
      { label: "Load vs Prev", value: "+12%" },
      { label: "Last Session", value: "Lower Body" },
    ],
  },
};

/* ─── Bands ─── */
/*  One source of truth for the 85 / 70 thresholds. Used by the rings,
 *  the status labels and the platform disc so they can never disagree.
 *  BODY is intentionally excluded — it is not graded. */

const BANDS = [
  { min: 85, id: "optimal", label: "Optimal" },
  { min: 70, id: "good", label: "Good" },
  { min: 0, id: "attention", label: "Pay Attention" },
];

/** @returns {{id: string, label: string}} */
function bandFor(score) {
  return BANDS.find(b => score >= b.min) || BANDS[BANDS.length - 1];
}

/** Mean of the category scores — drives the platform disc colour. */
function overallScore(categories) {
  if (!categories.length) return 0;
  return Math.round(
    categories.reduce((sum, c) => sum + c.score, 0) / categories.length
  );
}

/** Formats a BODY marker, falling back to an em-dash when absent. */
function markerValue(marker) {
  if (marker.value === null || marker.value === undefined) return "—";
  return marker.value + (marker.suffix || "");
}

/* ─── Nightly sleep records ─── */
/*  Index 0 is last night, 1 the night before, and so on. A null is a
 *  night with no reading — one the ring was not worn. The gaps are
 *  deliberate: a 90-day average built from a handful of nights must not
 *  be allowed to look authoritative.
 *
 *  Generated from a fixed seed so the mock does not shift between
 *  reloads. To wire up Oura, replace this with the real array of the
 *  same shape — nothing downstream changes. */
function mockNights(count) {
  /* mulberry32. The obvious `seed * 1664525` LCG overflows JavaScript's
     safe integer range and silently loses precision; this stays inside
     32-bit integer maths via Math.imul, so the sequence is exact. */
  let seed = 20261121;
  const rnd = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* Real wearables leave multi-week holes — a trip, a lost charger —
     not evenly scattered misses. Those are what make a long average
     untrustworthy, so the mock has them explicitly. */
  const GAPS = [[34, 55], [71, 82], [104, 126]];
  const inGap = i => GAPS.some(g => i >= g[0] && i <= g[1]);

  const out = [];
  for (let i = 0; i < count; i++) {
    const missed = rnd() > 0.9;
    if (i > 0 && (inGap(i) || missed)) {
      out.push(null);
      continue;
    }
    const drift = Math.sin(i / 11) * 18 + (rnd() - 0.5) * 40;
    out.push({
      deep: Math.round(64 + drift * 0.25),
      rem: Math.round(88 + drift * 0.35),
      light: Math.round(228 + drift * 0.6),
      awake: Math.round(22 + (rnd() - 0.5) * 14),
      hrv: Math.round(42 + drift * 0.08),
      hr: Math.round(58 - drift * 0.03),
      low: Math.round(51 - drift * 0.03),
    });
  }
  /* Last night is pinned, so the Night view shows known figures. */
  out[0] = { deep: 64, rem: 88, light: 228, awake: 22, hrv: 42, hr: 58, low: 51 };
  return out;
}

/**
 * Mean sleep across a window of nights, plus how many nights it is
 * actually built from. `offset` of 0 is the current window; an offset of
 * `days` gives the previous equivalent window, for the delta.
 */
function sleepWindow(nights, days, offset) {
  const slice = nights.slice(offset, offset + days);
  const got = slice.filter(Boolean);
  const mean = f => (got.length ? got.reduce((sum, n) => sum + f(n), 0) / got.length : 0);
  const stages = [
    { id: "deep", label: "Deep", minutes: Math.round(mean(n => n.deep)), asleep: true },
    { id: "rem", label: "REM", minutes: Math.round(mean(n => n.rem)), asleep: true },
    { id: "light", label: "Light", minutes: Math.round(mean(n => n.light)), asleep: true },
    { id: "awake", label: "Awake", minutes: Math.round(mean(n => n.awake)), asleep: false },
  ];
  return {
    covered: got.length,
    total: days,
    /* Derived from the rounded stages so the headline figure and the
       stage breakdown can never disagree by a stray minute. */
    asleep: stages.reduce((sum, st) => (st.asleep ? sum + st.minutes : sum), 0),
    stages,
    vitals: [
      /* Short labels: three columns across 393pt cannot carry long ones. */
      { label: "HRV", value: Math.round(mean(n => n.hrv)), suffix: " ms" },
      { label: "Avg HR", value: Math.round(mean(n => n.hr)), suffix: " bpm" },
      { label: "Low HR", value: Math.round(mean(n => n.low)), suffix: " bpm" },
    ],
  };
}

/** Minutes to "6h 20m" / "52m". Named to avoid colliding with the
 *  seconds-based formatDuration() that app.js declares globally. */
function formatMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? h + "h " + String(m).padStart(2, "0") + "m" : m + "m";
}

/** Position on the main sleep bar, 0–100, clamped to the scale. */
function sleepScalePct(sleep, minutes) {
  const lo = sleep.scaleMinHours * 60;
  const hi = sleep.scaleMaxHours * 60;
  return Math.max(0, Math.min(100, ((minutes - lo) / (hi - lo)) * 100));
}
