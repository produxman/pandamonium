/* ─── Dashboard ─── */
/*  RPG-style health home screen. Reads everything from HEALTH_DATA
 *  (health-data.js). Wrapped in an IIFE because this file and app.js are
 *  plain scripts sharing one global scope — the hook destructure below
 *  would otherwise clash with the identical line at the top of app.js. */

(function () {
  const { useState, useRef, useEffect, useLayoutEffect } = React;

  /* Tapping this category's ring reveals the workout tracker, since the
     tracker is what feeds it. */
  const TRACKER_CATEGORY = "power";

  /* Which data section the bottom panel shows for the selected ring.
     Nothing selected falls back to "body". */
  const PANEL_FOR = {
    vitality: "body",
    power: "training",
    recovery: "sleep",
  };

  /* ─── CategoryRing ─── */
  function CategoryRing({ category, active, onSelect }) {
    const { id, label, score } = category;
    const band = bandFor(score);
    /* The SVG canvas is padded well beyond the ring itself. The progress
       glow is a drop-shadow, and an SVG viewport clips to its own bounds —
       with the ring flush to the edge the halo cuts off square. PAD gives
       it room to fade out properly. */
    const size = 67, stroke = 7, pad = 8;
    const r = (size - stroke) / 2;
    const box = size + pad * 2;
    const mid = box / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);

    /* Hue encodes identity, score encodes vividness — so a ring carries
       both its section class and its band class, and they never fight. */
    const classes = "rpg-ring rpg-ring--" + id + " rpg-ring--" + band.id +
      (active ? " rpg-ring--active" : "");

    return React.createElement("button", {
      type: "button",
      className: classes,
      id: "rpg-tab-" + id,
      role: "tab",
      "aria-selected": active,
      "aria-controls": "rpg-panel",
      onClick: () => onSelect(active ? null : id),
      "aria-label": label + ", score " + score + " out of 100, " + band.label
    },
      React.createElement("span", { className: "rpg-ring__dial" },
        React.createElement("svg", { width: box, height: box, "aria-hidden": "true" },
          React.createElement("circle", {
            className: "rpg-ring__track",
            cx: mid, cy: mid, r, fill: "none", strokeWidth: stroke
          }),
          React.createElement("circle", {
            className: "rpg-ring__progress",
            cx: mid, cy: mid, r, fill: "none",
            strokeWidth: stroke, strokeLinecap: "round",
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transform: "rotate(-90 " + mid + " " + mid + ")"
          })
        ),
        React.createElement("span", { className: "rpg-ring__score" }, score)
      ),
      React.createElement("span", { className: "rpg-ring__label" }, label),
      React.createElement("span", { className: "rpg-ring__status" },
        band.id === "attention" && React.createElement("i", {
          className: "rpg-ring__alert", "aria-hidden": "true"
        }),
        band.label
      )
    );
  }

  /* ─── Avatar variants ─── */
  /*  Two keys pick the image: the section (the selected ring, or Vitality
   *  when nothing is selected) and the band (that section's own score, or
   *  the overall score when nothing is selected).
   *
   *  Band ids are optimal | good | attention; on disk the third is "bad". */
  const BAND_FILE = { optimal: "optimal", good: "good", attention: "bad" };

  function avatarSrc(sectionId, bandId) {
    return "img/avatar-" + sectionId + "-" + (BAND_FILE[bandId] || "good") + ".png";
  }

  /*  A missing variant falls back to that section's -good image, which is
   *  the guaranteed baseline. Six of the nine are still being drawn, so
   *  this path is live — it must never leave a broken image behind. */
  function goodSrcFor(src) {
    return src.replace(/-(optimal|good|bad)\.png$/, "-good.png");
  }

  function resolveSrc(src, failed) {
    if (!failed[src]) return src;
    const good = goodSrcFor(src);
    return good !== src && !failed[good] ? good : null;
  }

  /*  Only the reachable combinations are rendered, and rendering them is
   *  what preloads them. Everything else needs a data reload to reach, so
   *  fetching all nine would be waste. */
  function reachableVariants(categories, overall) {
    const out = [];
    const push = (cat, band) => {
      const key = cat.id + ":" + band.id;
      if (out.some(v => v.key === key)) return;
      out.push({
        key,
        src: avatarSrc(cat.id, band.id),
        alt: "Your character — " + cat.label + ", " + band.label
      });
    };
    push(categories[0], bandFor(overall));          // nothing selected
    categories.forEach(c => push(c, bandFor(c.score)));
    return out;
  }

  /* ─── AvatarHero ─── */
  function AvatarHero({ overall, categories, activeId }) {
    const band = bandFor(overall);
    const [failed, setFailed] = useState({});

    /* Nothing selected: Vitality, graded on the overall score. */
    const section = activeId ? categories.find(c => c.id === activeId) : categories[0];
    const shownKey = section.id + ":" + (activeId ? bandFor(section.score) : band).id;
    const variants = reachableVariants(categories, overall);

    return React.createElement("section", {
      className: "rpg-hero",
      "aria-label": "Avatar and category scores"
    },
      React.createElement("div", { className: "rpg-hero__stage" },

        /* Everything that must sit relative to the avatar: the violet
           ambient glow behind it, the band-tinted light disc and contact
           shadow under it, and the overall badge on that disc. */
        React.createElement("div", { className: "rpg-hero__figure" },
          React.createElement("div", { className: "rpg-hero__aura", "aria-hidden": "true" }),
          React.createElement("div", { className: "rpg-hero__disc", "aria-hidden": "true" }),
          React.createElement("div", { className: "rpg-hero__shadow", "aria-hidden": "true" }),

          /* All three variants live in the DOM from first paint — that is
             what preloads them. The cross-fade is opacity only and the src
             never changes, so the identically-posed character appears to
             change clothes rather than move. */
          React.createElement("div", { className: "rpg-hero__stack" },
            variants.map(v => {
              const src = resolveSrc(v.src, failed);
              if (!src) return null;
              const on = v.key === shownKey;
              return React.createElement("img", {
                key: v.key,
                className: "rpg-hero__avatar" + (on ? " rpg-hero__avatar--on" : ""),
                src,
                alt: v.alt,
                "aria-hidden": on ? undefined : "true",
                decoding: "async",
                onError: () => setFailed(prev =>
                  prev[src] ? prev : Object.assign({}, prev, { [src]: true }))
              });
            })
          ),

          React.createElement("div", { className: "rpg-hero__badge" },
            React.createElement("span", { className: "rpg-hero__badge-score" }, overall),
            React.createElement("span", { className: "rpg-hero__badge-label" }, band.label)
          )
        ),

      )
    );
  }

  /* ─── RingTabs ─── */
  /*  The three rings select which panel shows below, which is a tab
   *  pattern — so it carries tablist semantics and sits directly above
   *  the panel it controls, where the connector notch can reach it. */
  function RingTabs({ categories, activeId, onSelect }) {
    const onKeyDown = e => {
      const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]'));
      const i = tabs.indexOf(document.activeElement);
      tabs[(((i < 0 ? 0 : i) + dir) + tabs.length) % tabs.length].focus();
    };

    return React.createElement("div", {
      className: "rpg-tabs",
      role: "tablist",
      "aria-label": "Health sections",
      onKeyDown
    },
      categories.map(c =>
        React.createElement(CategoryRing, {
          key: c.id, category: c, active: activeId === c.id, onSelect
        })
      )
    );
  }

  /* ─── Metrics row ─── */
  /*  Shared by the BODY markers, the sleep vitals and the training
   *  figures so all three read as the same component. */
  function MetricRow({ items }) {
    return React.createElement("div", { className: "rpg-metrics" },
      items.map(m =>
        React.createElement("div", { className: "rpg-metric", key: m.label },
          React.createElement("span", {
            className: "rpg-metric__value" +
              (m.value === null || m.value === undefined ? " rpg-metric__value--empty" : "")
          }, markerValue(m)),
          React.createElement("span", { className: "rpg-metric__label" }, m.label)
        )
      )
    );
  }

  /* ─── BodySection ─── */
  /*  Unscored on purpose: no band, no colour grading, no status label. */
  function BodySection({ body }) {
    const { start, current, goal, unit } = body.weight;
    const span = start - goal;
    const pct = span === 0
      ? 0
      : Math.max(0, Math.min(100, ((start - current) / span) * 100));

    return React.createElement(React.Fragment, null,
      React.createElement("div", {
        className: "rpg-body__track",
        role: "progressbar",
        "aria-valuemin": goal,
        "aria-valuemax": start,
        "aria-valuenow": current,
        "aria-label": "Weight " + current + unit + ", from " + start + unit + " toward " + goal + unit
      },
        React.createElement("div", { className: "rpg-body__fill", style: { width: pct + "%" } }),
        React.createElement("div", { className: "rpg-body__pin", style: { left: pct + "%" } })
      ),
      React.createElement("div", { className: "rpg-body__scale" },
        React.createElement("span", null, start + unit),
        React.createElement("span", { className: "rpg-body__now" }, current + unit),
        React.createElement("span", null, goal + unit)
      ),
      React.createElement(MetricRow, { items: body.markers })
    );
  }

  /* ─── RangeTabs ─── */
  /*  Deliberately generic: any panel mounts one and passes its own id.
   *  The choice is scoped and persisted per panel, so Vitality and Power
   *  can adopt this without a second copy of the component. */
  const RANGES = [
    { id: "night", label: "Night", days: 1, caption: "Asleep last night" },
    { id: "week", label: "Week", days: 7, caption: "Nightly average" },
    { id: "month", label: "Month", days: 30, caption: "Nightly average" },
    { id: "quarter", label: "3M", days: 90, caption: "Nightly average" },
  ];

  function useRange(panelId) {
    const key = "range:" + panelId;
    const [value, setValue] = useState(() => {
      try {
        const saved = localStorage.getItem(key);
        return RANGES.some(r => r.id === saved) ? saved : "night";
      } catch {
        return "night";
      }
    });
    useEffect(() => {
      try { localStorage.setItem(key, value); } catch (e) {}
    }, [key, value]);
    return [value, setValue];
  }

  /*  A radiogroup, not a tablist: these filter one panel's figures
   *  rather than switching between panels. */
  function RangeTabs({ value, onChange }) {
    return React.createElement("div", {
      className: "rpg-range", role: "radiogroup", "aria-label": "Time range"
    },
      RANGES.map(r =>
        React.createElement("button", {
          key: r.id,
          type: "button",
          className: "rpg-range__seg" + (r.id === value ? " rpg-range__seg--on" : ""),
          role: "radio",
          "aria-checked": r.id === value,
          onClick: () => onChange(r.id)
        }, r.label)
      )
    );
  }

  /* ─── SleepSection ─── */
  function SleepSection({ sleep }) {
    const [range, setRange] = useRange("recovery");
    const def = RANGES.find(r => r.id === range) || RANGES[0];

    const win = sleepWindow(sleep.nights, def.days, 0);
    const prev = def.days > 1 ? sleepWindow(sleep.nights, def.days, def.days) : null;
    const delta = prev && prev.covered ? win.asleep - prev.asleep : null;

    /* Below 60% the figures are dimmed and the coverage line says so,
       rather than letting a thin average read as authoritative. */
    const thin = def.days > 1 && win.covered / win.total < 0.6;

    const inBed = win.stages.reduce((sum, st) => sum + st.minutes, 0) || 1;
    const fillPct = sleepScalePct(sleep, win.asleep);
    const targetPct = sleepScalePct(sleep, sleep.targetHours * 60);

    /* One meta line instead of two. The range is already named by the
       selected segment, so it is not repeated here. */
    const meta = def.days === 1
      ? def.caption
      : (thin ? "Limited data" : def.caption) +
        " · " + win.covered + " of " + win.total + " nights";

    return React.createElement("div", {
      className: "rpg-sleep" + (thin ? " rpg-sleep--thin" : "")
    },

      React.createElement(RangeTabs, { value: range, onChange: setRange }),

      /* Keyed so the figures cross-fade when the range changes. The bars
         below are deliberately NOT keyed, so their widths animate
         instead of being replaced. */
      React.createElement("div", { key: range, className: "rpg-sleep__fade" },
        React.createElement("div", { className: "rpg-sleep__head" },
          React.createElement("span", { className: "rpg-sleep__total" }, formatMinutes(win.asleep)),
          delta === null ? null : React.createElement("span", {
            className: "rpg-sleep__delta" + (delta > 0 ? " rpg-sleep__delta--up" : "")
          },
            (delta > 0 ? "\u25B2 " : delta < 0 ? "\u25BC " : "") +
            formatMinutes(Math.abs(delta))
          )
        ),
        React.createElement("div", { className: "rpg-sleep__meta" }, meta)
      ),

      /* Main bar. The 7h target tick is what makes the fill mean anything,
         so it is drawn on the same scale rather than as a separate figure. */
      React.createElement("div", {
        className: "rpg-sleep__bar",
        role: "progressbar",
        "aria-valuemin": sleep.scaleMinHours * 60,
        "aria-valuemax": sleep.scaleMaxHours * 60,
        "aria-valuenow": win.asleep,
        "aria-label": formatMinutes(win.asleep) + " asleep, against a " + sleep.targetHours + " hour target"
      },
        React.createElement("div", { className: "rpg-sleep__fill", style: { width: fillPct + "%" } }),
        React.createElement("div", { className: "rpg-sleep__target", style: { left: targetPct + "%" } },
          React.createElement("span", { className: "rpg-sleep__target-label" }, sleep.targetHours + "h")
        )
      ),

      /* Stage composition, proportional to time in bed. */
      React.createElement("div", { className: "rpg-sleep__stages", "aria-hidden": "true" },
        win.stages.map(st =>
          React.createElement("span", {
            key: st.id,
            className: "rpg-sleep__stage rpg-sleep__stage--" + st.id,
            style: { width: (st.minutes / inBed * 100).toFixed(2) + "%" }
          })
        )
      ),

      React.createElement("div", { key: range + "-legend", className: "rpg-metrics rpg-metrics--legend rpg-sleep__fade" },
        win.stages.map(st =>
          React.createElement("div", { className: "rpg-metric", key: st.id },
            React.createElement("span", { className: "rpg-metric__stage" },
              React.createElement("i", {
                className: "rpg-sleep__dot rpg-sleep__dot--" + st.id,
                "aria-hidden": "true"
              }),
              st.label
            ),
            React.createElement("span", { className: "rpg-metric__value" },
              formatMinutes(st.minutes))
          )
        )
      ),

      React.createElement("div", { key: range + "-vitals", className: "rpg-sleep__fade" },
        React.createElement(MetricRow, { items: win.vitals })
      )
    );
  }

  /* ─── TrainingSection ─── */
  /*  Inferred shape — the brief pointed at a spec note that was not
   *  included. Mirrors the figures in the Power narrative. */
  function TrainingSection({ training }) {
    const slots = [];
    for (let i = 0; i < training.sessionsPlanned; i++) {
      slots.push(React.createElement("span", {
        key: i,
        className: "rpg-train__slot" + (i < training.sessionsCompleted ? " rpg-train__slot--done" : "")
      }));
    }

    return React.createElement(React.Fragment, null,
      React.createElement("div", { className: "rpg-sleep__head" },
        React.createElement("span", { className: "rpg-sleep__total" },
          training.sessionsCompleted + " / " + training.sessionsPlanned),
        React.createElement("span", { className: "rpg-sleep__meta" }, "Sessions this week")
      ),
      React.createElement("div", {
        className: "rpg-train__slots",
        role: "progressbar",
        "aria-valuemin": 0,
        "aria-valuemax": training.sessionsPlanned,
        "aria-valuenow": training.sessionsCompleted,
        "aria-label": training.sessionsCompleted + " of " + training.sessionsPlanned + " planned sessions completed"
      }, slots),
      React.createElement(MetricRow, { items: training.metrics })
    );
  }

  /* ─── ContextPanel ─── */
  /*  Swaps its contents when the selected ring changes. The outgoing
   *  panel is kept mounted for the length of the fade and stacked on top
   *  of the incoming one, so the two genuinely cross-fade. The height is
   *  measured and written back as an inline style, which is what lets CSS
   *  transition between two panels of different heights — there is no
   *  animation library here, only a measured value and a CSS transition. */
  function ContextPanel({ panelKey, children }) {
    const measure = useRef(null);
    const prevKey = useRef(panelKey);
    const prevNode = useRef(children);
    const timer = useRef(null);
    const [height, setHeight] = useState(null);
    const [leaving, setLeaving] = useState(null);

    useLayoutEffect(() => {
      if (prevKey.current !== panelKey) {
        setLeaving({ key: prevKey.current, node: prevNode.current });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setLeaving(null), 360);
        prevKey.current = panelKey;
      }
      prevNode.current = children;
    });

    /* Re-measure on swap, and keep following the content afterwards so a
       resize or font change cannot leave the wrapper clipping. */
    useLayoutEffect(() => {
      const el = measure.current;
      if (!el) return;
      const sync = () => setHeight(el.offsetHeight);
      sync();
      if (typeof ResizeObserver === "undefined") return;
      const ro = new ResizeObserver(sync);
      ro.observe(el);
      return () => ro.disconnect();
    }, [panelKey]);

    useEffect(() => () => clearTimeout(timer.current), []);

    return React.createElement("div", {
      className: "rpg-panel",
      style: height === null ? undefined : { height: height + "px" }
    },
      leaving && React.createElement("div", {
        key: "out-" + leaving.key,
        className: "rpg-panel__layer rpg-panel__layer--out",
        "aria-hidden": "true"
      }, leaving.node),
      React.createElement("div", {
        key: "in-" + panelKey,
        ref: measure,
        className: "rpg-panel__layer"
      }, children)
    );
  }

  /* ─── Dashboard ─── */
  function Dashboard({ onOpenWorkout }) {
    const data = HEALTH_DATA;
    const [activeId, setActiveId] = useState(null);

    const overall = overallScore(data.categories);
    const active = data.categories.find(c => c.id === activeId) || null;

    const panelKind = active ? (PANEL_FOR[active.id] || "body") : "body";
    const panelKey = activeId || "none";

    const section =
      panelKind === "sleep" ? React.createElement(SleepSection, { sleep: data.sleep })
      : panelKind === "training" ? React.createElement(TrainingSection, { training: data.training })
      : React.createElement(BodySection, { body: data.body });

    return React.createElement("div", {
      className: "rpg",
      "data-theme": activeId || data.categories[0].id
    },
      /* The top bar is deliberately not rendered. profile.level and
         profile.xp stay in the data module so it can come back alongside
         quests and streaks without re-plumbing anything. */
      React.createElement("main", { className: "rpg__scroll" },
        React.createElement(AvatarHero, {
          overall,
          categories: data.categories,
          activeId
        }),

        React.createElement(RingTabs, {
          categories: data.categories,
          activeId,
          onSelect: setActiveId
        }),

        /* One persistent card. Only its contents swap, so the card's own
           chrome and shadow stay put while the height morphs. */
        React.createElement("section", {
          className: "rpg-card",
          id: "rpg-panel",
          role: "tabpanel",
          /* With no tab selected the panel is not owned by one, so it
             names itself instead of pointing at a non-existent tab. */
          "aria-labelledby": activeId ? "rpg-tab-" + activeId : undefined,
          "aria-label": activeId ? undefined : "Body panel"
        },
          React.createElement(ContextPanel, { panelKey },
            React.createElement(React.Fragment, null,
              React.createElement("h2", { className: "rpg-card__title" },
                active ? active.label : "Body"),
              /* The narrative paragraph is deliberately not rendered. The
                 `detail` field stays in the data module and .rpg-detail__text
                 stays in the stylesheet, so re-enabling it later is one line
                 and needs no re-plumbing. */
              section
            )
          )
        ),

        active && active.id === TRACKER_CATEGORY && React.createElement("button", {
          className: "rpg-link rpg-link--reveal",
          onClick: onOpenWorkout
        },
          "Open Workout Tracker",
          React.createElement("span", { "aria-hidden": "true" }, "›")
        )
      )
    );
  }

  window.Dashboard = Dashboard;
})();
