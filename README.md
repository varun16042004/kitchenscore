# KitchenScore — MVP (v0.2)

An independent restaurant kitchen-safety information platform. Hyderabad pilot.
Built against the scope defined in the companion planning docs (Project Overview,
Target Market Analysis, Market Needs & Pain Points, Industry Classification, Risk
Management Plan, Monetization & Revenue Plan).

## What's in this build

- Restaurant search (by name or area)
- Restaurant profile page showing a **freshness-aware public record** — see the
  data model note below, this is not a single "score"
- A **Request Inspection** button with a public, per-restaurant request counter
- A **Report an error** form for flagging wrong or outdated matches
- Zero external dependencies — plain Node.js `http` server, no npm install required

## The data model: Ratings vs. Raids

`data/restaurants.json` now holds **real, sourced data** — 179 Hyderabad
restaurants, 180 public inspection events from 2024–2026 — transformed from a
research workbook the founder compiled from official social accounts (Commissioner
of Food Safety Telangana `@cfs_telangana`, Cyberabad Municipal Corporation
`@CMC_Offcl`, Malkajgiri Municipal Corporation) and cross-checked against news
reporting (NDTV Food, New Indian Express, Siasat, and others).

This is **not** FSSAI's Hygiene Rating Scheme data — it's a distinct dataset of
enforcement and municipal-inspection activity. Each restaurant has an `events[]`
array, and every event is tagged one of two types, kept deliberately separate in
both the data and the UI:

- **`rating`** — a numeric municipal hygiene score, sourced from CMC. Shown with a
  green/amber/red score badge.
- **`raid`** — an enforcement inspection with no formal score, sourced from CFS
  Telangana or Malkajgiri task-force activity. Shown with a distinct amber "Raid
  reported" badge and the violation narrative, never presented as a numeric score.

Only 37 of 179 restaurants (~21%) have a `rating` event; the rest have one or more
`raid` events only. The freshness indicator and UI copy say which type they're
describing ("Last public rating…" vs "Last public raid…") rather than a generic
"inspected," and every event links to its original source. The home page and every
profile page also carry the dataset's own caution forward: **inclusion means a
public inspection or raid occurred — it does not by itself mean a restaurant is
currently unsafe.**

This is also not a complete statutory log — GHMC alone reportedly ran 9,656
food-safety inspections in 2025, of which only a fraction were publicly named.
Coverage will always be partial by nature of the source (only what became public).

⚠️ **Before any public launch**, get the one-time legal consultation already
budgeted in the Project Overview to review this specific use — republishing named
violation findings, even when accurately sourced from public reporting, carries
real defamation exposure, which is exactly the top risk the Risk Management Plan
flags. This build ships the differentiated Rating/Raid UI as a risk-mitigation
step, not as a substitute for that review.

## Running locally

```
node server.js
```

Then open http://localhost:3000. No build step, no install step.

To use a different port: `PORT=4000 node server.js`.

## Project structure

```
kitchenscore/
  server.js          # HTTP server + API routes
  db.js               # File-backed data layer (restaurants.json / reports.json)
  freshness.js         # Data-freshness scoring logic (type-aware: rating vs raid)
  data/
    restaurants.json   # Real data — 179 restaurants, 180 sourced events, see above
    reports.json        # Runtime store for "report an error" submissions
  public/
    index.html
    app.js              # Client-side search + restaurant profile views (hash routing)
    styles.css
```

## API

- `GET /api/restaurants?q=<query>` — search by name/area/restaurant type; each
  result includes `latestEvent` (most recent rating or raid) and `eventCount`
- `GET /api/restaurants/:id` — single restaurant, includes the full `events[]`
  history plus computed freshness
- `POST /api/restaurants/:id/request-inspection` — increments the public counter
- `POST /api/restaurants/:id/report-error` — body `{ "message": "..." }`

## Regenerating the dataset

The transform script that built `data/restaurants.json` from the source workbook
is `transform_inspections.py` (not included in this package — ask if you need it
re-run against an updated source file). It classifies events by authority (CMC →
`rating`, CFS Telangana/Malkajgiri → `raid`), handles partial dates (e.g. "June
2026, exact date not stated"), and sorts each restaurant's events newest-first.

Official FSSAI Hygiene Rating Scheme data (a separate, still-untapped source) can
still be added later via `hygiene.fssai.gov.in/knowRating.php` (State → District →
Eatery search) — that would become a third event type once pulled in.

## Deploying

This MVP deliberately uses flat JSON files for storage — fine for local dev and
early testing. Two paths from here:

- **Render / Railway (recommended for now):** both support a small persistent
  disk on the free/cheap tier, so `data/*.json` can keep working as-is. Point the
  start command at `node server.js`.
- **Vercel:** works well for the static frontend, but its serverless functions
  have an ephemeral filesystem — `data/restaurants.json` writes (request counts,
  error reports) would not persist between requests. If deploying here, swap the
  file-backed `db.js` for a small hosted store first (e.g. a free-tier Postgres or
  Vercel KV) — everything else (routes, freshness logic, frontend) stays the same,
  since `db.js` is the only file that would need to change.

## Not yet built (explicitly out of MVP scope per the Project Overview)

- WhatsApp bot interface (the web tool above covers the same core interaction;
  the WhatsApp Business API integration is a separate, later build)
- Official FSSAI Hygiene Rating Scheme data (a distinct, still-untapped source —
  see "Regenerating the dataset" above)
- Restaurant/partner-facing outreach views, B2B chain-compliance dashboard,
  monetization/payments — all explicitly deferred to later phases in the Scope
  Statement
