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
