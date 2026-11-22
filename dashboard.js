/* ─── Dashboard ─── */
/*  RPG-style health home screen. Reads everything from HEALTH_DATA
 *  (health-data.js). Wrapped in an IIFE because this file and app.js are
 *  plain scripts sharing one global scope — the hook destructure below
 *  would otherwise clash with the identical line at the top of app.js. */

(function () {
  const { useState } = React;

  /* Tapping this category's ring reveals the workout tracker, since the
     tracker is what feeds it. */
  const TRACKER_CATEGORY = "power";

  /* ─── TopBar ─── */
  function TopBar({ name, level, xp, xpToNext }) {
    const pct = Math.min(100, Math.round((xp / xpToNext) * 100));
    return React.createElement("header", { className: "rpg-topbar" },
      React.createElement("span", { className: "rpg-topbar__name" }, name),
      React.createElement("span", { className: "rpg-topbar__level" }, "LV." + level),
      React.createElement("div", {
        className: "rpg-topbar__xp",
        role: "progressbar",
        "aria-valuenow": xp,
        "aria-valuemin": 0,
        "aria-valuemax": xpToNext,
        "aria-label": "Experience toward level " + (level + 1)
      },
        React.createElement("div", {
          className: "rpg-topbar__xp-fill",
          style: { width: pct + "%" }
        })
      ),
      React.createElement("span", { className: "rpg-topbar__xp-text" }, xp + " / " + xpToNext)
    );
  }

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

    return React.createElement("button", {
      className: "rpg-ring rpg-ring--" + band.id + (active ? " rpg-ring--active" : ""),
      onClick: () => onSelect(active ? null : id),
      "aria-expanded": active,
      "aria-label": label + ", score " + score + " out of 100, " + band.label
    },
      React.createElement("span", { className: "rpg-ring__dial" },
        React.createElement("svg", { width: box, height: box, "aria-hidden": "true" },
          React.createElement("circle", {
            cx: mid, cy: mid, r, fill: "none",
            stroke: "var(--rpg-ring-track)", strokeWidth: stroke
          }),
          React.createElement("circle", {
            className: "rpg-ring__progress",
            cx: mid, cy: mid, r, fill: "none",
            stroke: "var(--rpg-band)", strokeWidth: stroke, strokeLinecap: "round",
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transform: "rotate(-90 " + mid + " " + mid + ")"
          })
        ),
        React.createElement("span", { className: "rpg-ring__score" }, score)
      ),
      React.createElement("span", { className: "rpg-ring__label" }, label),
      React.createElement("span", { className: "rpg-ring__status" }, band.label)
    );
  }

  /* ─── AvatarHero ─── */
  function AvatarHero({ overall, categories, activeId, onSelect }) {
    const band = bandFor(overall);
    /* No ring selected falls back to the first category's variant. */
    const shownId = activeId || categories[0].id;

    return React.createElement("section", {
      className: "rpg-hero rpg-hero--" + band.id,
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
          React.createElement("div", {
            className: "rpg-hero__stack",
            role: "img",
            "aria-label": "Your character"
          },
            categories.map(c =>
              React.createElement("img", {
                key: c.id,
                className: "rpg-hero__avatar" + (c.id === shownId ? " rpg-hero__avatar--on" : ""),
                src: "img/avatar-" + c.id + ".png",
                alt: "",
                decoding: "async"
              })
            )
          ),

          React.createElement("div", { className: "rpg-hero__badge" },
            React.createElement("span", { className: "rpg-hero__badge-score" }, overall),
            React.createElement("span", { className: "rpg-hero__badge-label" }, band.label)
          )
        ),

        React.createElement("div", { className: "rpg-hero__rings" },
          categories.map(c =>
            React.createElement(CategoryRing, {
              key: c.id, category: c, active: activeId === c.id, onSelect
            })
          )
        )
      )
    );
  }

  /* ─── BodyPanel ─── */
  /*  Unscored on purpose: no band, no colour grading, no status label.
   *  These move when a new reading arrives, not every day. */
  function BodyPanel({ body }) {
    const { start, current, goal, unit } = body.weight;
    const span = start - goal;
    const pct = span === 0
      ? 0
      : Math.max(0, Math.min(100, ((start - current) / span) * 100));

    return React.createElement("section", { className: "rpg-card" },
      React.createElement("h2", { className: "rpg-card__title" }, "Body"),

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

      React.createElement("div", { className: "rpg-body__markers" },
        body.markers.map(m =>
          React.createElement("div", { className: "rpg-body__marker", key: m.label },
            React.createElement("span", {
              className: "rpg-body__marker-value" +
                (m.value === null || m.value === undefined ? " rpg-body__marker-value--empty" : "")
            }, markerValue(m)),
            React.createElement("span", { className: "rpg-body__marker-label" }, m.label)
          )
        )
      )
    );
  }

  /* ─── Dashboard ─── */
  function Dashboard({ onOpenWorkout }) {
    const data = HEALTH_DATA;
    const [activeId, setActiveId] = useState(null);

    const overall = overallScore(data.categories);
    const active = data.categories.find(c => c.id === activeId) || null;

    return React.createElement("div", { className: "rpg" },
      React.createElement(TopBar, {
        name: data.profile.name,
        level: data.profile.level,
        xp: data.profile.xp,
        xpToNext: data.profile.xpToNext
      }),

      React.createElement("main", { className: "rpg__scroll" },
        React.createElement(AvatarHero, {
          overall,
          categories: data.categories,
          activeId,
          onSelect: setActiveId
        }),

        active && React.createElement("section", {
          className: "rpg-card rpg-detail",
          "aria-label": active.label + " detail"
        },
          React.createElement("h2", { className: "rpg-card__title" }, active.label),
          React.createElement("p", { className: "rpg-detail__text" }, active.detail)
        ),

        active && active.id === TRACKER_CATEGORY && React.createElement("button", {
          className: "rpg-link rpg-link--reveal",
          onClick: onOpenWorkout
        },
          "Open Workout Tracker",
          React.createElement("span", { "aria-hidden": "true" }, "›")
        ),

        React.createElement(BodyPanel, { body: data.body })
      )
    );
  }

  window.Dashboard = Dashboard;
})();
