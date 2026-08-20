# KitchenScore — MVP (v0.1)

An independent restaurant kitchen-safety information platform. Hyderabad pilot.
Built against the scope defined in the companion planning docs (Project Overview,
Target Market Analysis, Market Needs & Pain Points, Industry Classification, Risk
Management Plan).

## What's in this build

- Restaurant search (by name or area)
- Restaurant profile page showing the FSSAI-style hygiene score, category, and a
  **data-freshness indicator** ("last inspected 2 months ago" / "7 years ago" / etc.)
- A **Request Inspection** button with a public, per-restaurant request counter
- A **Report an error** form for flagging wrong or outdated matches
- Zero external dependencies — plain Node.js `http` server, no npm install required.
  (This sandbox's npm registry access was blocked, so the build deliberately avoids
  needing `npm install` at all — a side benefit, since it also means nothing to
  break or update later for a bootstrap-stage MVP.)

## ⚠️ Important: the seed data is fake

`data/restaurants.json` contains six **[DEMO]**-prefixed restaurants with invented
scores and dates, used only to build and test the UI and the freshness logic.
**None of it is a real FSSAI record for a real restaurant.** Per the Project
Overview's own compliance rules (Section 16) and the Risk Management Plan's
top-priority risk (legal/defamation exposure), this file must be replaced with a
manually curated, sourced, and dated set of real FSSAI Hygiene Rating Scheme
records before any public launch. Do not deploy this build publicly with the demo
data still in place.

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
  freshness.js         # Data-freshness scoring logic
  data/
    restaurants.json   # Seed dataset — REPLACE before launch, see warning above
    reports.json        # Runtime store for "report an error" submissions
  public/
    index.html
    app.js              # Client-side search + restaurant profile views (hash routing)
    styles.css
```

## API

- `GET /api/restaurants?q=<query>` — search by name/area/address
- `GET /api/restaurants/:id` — single restaurant with computed freshness
- `POST /api/restaurants/:id/request-inspection` — increments the public counter
- `POST /api/restaurants/:id/report-error` — body `{ "message": "..." }`

## Replacing the seed data with real FSSAI records

Per the Project Overview's Dependencies section, the intended source is
`hygiene.fssai.gov.in`. It has a public per-restaurant search tool at
`/knowRating.php` (State → District → Eatery), which returns individual scores,
rating categories, and audit dates — this is the granular data the freshness
indicator needs, distinct from any bulk export. Data collection is manual at this
stage (no published API or reuse terms), consistent with the MVP's documented
scope. Add real, sourced, dated entries to `data/restaurants.json` following the
existing schema, and drop the `isDemoData` flag (and `[DEMO]` name prefix) once a
record is real and verified.

## Deploying

This MVP deliberately uses flat JSON files for storage — fine for local dev and
early testing, per the Project Overview's guidance against premature scaling
investment. Two paths from here, matching the budget/hosting dependencies already
named in the Project Overview:

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
- Real, curated FSSAI dataset (see warning above)
- Restaurant/partner-facing outreach views, B2B chain-compliance dashboard,
  monetization/payments — all explicitly deferred to later phases in the Scope
  Statement
