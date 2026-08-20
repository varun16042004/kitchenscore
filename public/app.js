const app = document.getElementById("app");
const logoLink = document.getElementById("logo-link");

logoLink.addEventListener("click", () => {
  window.location.hash = "";
});

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}

function formatScore(score) {
  if (score == null) return "";
  return Number.isInteger(score) ? String(score) : String(Math.round(score * 10) / 10);
}

// Buckets a raw municipal hygiene score (0-100) into a tier for badge coloring.
// These bucket lines are KitchenScore's own display convention, not an
// official FSSAI/CMC category — the underlying number is always shown too.
function scoreTierClass(score) {
  if (score == null) return "tier-none";
  if (score >= 85) return "tier-fresh";
  if (score >= 70) return "tier-recent";
  if (score >= 50) return "tier-dated";
  return "tier-stale";
}

function eventTypeLabel(type) {
  if (type === "rating") return "Municipal hygiene rating";
  if (type === "raid") return "Enforcement raid";
  return "Public record";
}

function render() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash.startsWith("restaurant/")) {
    const id = decodeURIComponent(hash.slice("restaurant/".length));
    renderRestaurant(id);
  } else {
    renderHome();
  }
}

async function renderHome(initialQuery) {
  const query = initialQuery || "";
  app.innerHTML = `
    <div class="hero">
      <h1>Know before you dine.</h1>
      <p>Search publicly reported hygiene ratings and food-safety enforcement actions for Hyderabad restaurants.</p>
      <form class="search-box" id="search-form">
        <input type="text" id="search-input" placeholder="Search by restaurant name or area…" value="${escapeHtml(query)}" autofocus />
        <button type="submit">Search</button>
      </form>
      <div class="demo-banner">
        Two kinds of record appear here, kept clearly separate: a <strong>rating</strong> is a numeric municipal hygiene score
        (Cyberabad Municipal Corporation); a <strong>raid</strong> is an enforcement inspection with no formal score
        (Telangana Commissioner of Food Safety / Malkajgiri task forces). Neither is FSSAI's Hygiene Rating Scheme.
        A restaurant's inclusion means a public inspection or raid occurred — it does not by itself mean it is currently unsafe.
      </div>
    </div>
    <div class="results-list" id="results-list"></div>
    <div class="disclaimer">
      KitchenScore is an independent project that republishes publicly reported, sourced, and dated hygiene ratings and
      food-safety enforcement records for Hyderabad. It is not affiliated with any government agency, and does not itself
      certify any restaurant as safe or unsafe.
    </div>
  `;

  document.getElementById("search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("search-input").value;
    loadResults(q);
  });

  loadResults(query);
}

async function loadResults(query) {
  const list = document.getElementById("results-list");
  if (!list) return;
  list.innerHTML = `<div class="empty-state">Searching…</div>`;
  try {
    const res = await fetch(`/api/restaurants?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data.restaurants.length) {
      list.innerHTML = `<div class="empty-state">No restaurants found. Try a different name or area — or check back as coverage grows.</div>`;
      return;
    }
    list.innerHTML = data.restaurants
      .map((r) => {
        const ev = r.latestEvent;
        let pillClass = "tier-none";
        let pillLabel = "No data";
        if (ev && ev.type === "rating") {
          pillClass = scoreTierClass(ev.score);
          pillLabel = formatScore(ev.score);
        } else if (ev && ev.type === "raid") {
          pillClass = "tier-raid";
          pillLabel = "Raid reported";
        }
        return `
          <a class="result-card" href="#/restaurant/${encodeURIComponent(r.id)}">
            <div class="result-top">
              <div>
                <div class="result-name">${escapeHtml(r.name)}</div>
                <div class="result-area">${escapeHtml(r.area)}${r.eventCount > 1 ? ` · ${r.eventCount} public records` : ""}</div>
              </div>
              <div class="score-pill ${pillClass}">${escapeHtml(pillLabel)}</div>
            </div>
          </a>
        `;
      })
      .join("");
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Something went wrong loading results. Please try again.</div>`;
  }
}

function renderEventCard(ev) {
  const isRating = ev.type === "rating";
  const typeClass = isRating ? "event-type-rating" : "event-type-raid";
  const dateText = ev.dateLabel || "Date not stated";

  return `
    <div class="event-card ${typeClass}">
      <div class="event-head">
        <span class="event-type-badge ${typeClass}">${isRating ? "RATING" : "RAID"}</span>
        <span class="event-date">${escapeHtml(dateText)}${ev.dateExact === false ? " (exact date not stated)" : ""}</span>
      </div>
      ${
        isRating
          ? `<div class="event-score ${scoreTierClass(ev.score)}">${escapeHtml(formatScore(ev.score))}<span class="event-score-suffix">/100</span></div>`
          : `<div class="event-outcome">${escapeHtml(ev.outcome || "Violations recorded")}</div>`
      }
      ${ev.findings ? `<div class="event-findings">${escapeHtml(ev.findings)}</div>` : ""}
      <div class="event-source">
        ${escapeHtml(ev.authority || "")}
        ${ev.sourceUrl ? ` — <a href="${escapeHtml(ev.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ev.sourceTitle || "source")}</a>` : ""}
      </div>
    </div>
  `;
}

async function renderRestaurant(id) {
  app.innerHTML = `<div class="empty-state">Loading…</div>`;
  let r;
  try {
    const res = await fetch(`/api/restaurants/${encodeURIComponent(id)}`);
    if (!res.ok) {
      app.innerHTML = `<div class="empty-state">Restaurant not found. <a href="#/">Back to search</a></div>`;
      return;
    }
    r = await res.json();
  } catch (err) {
    app.innerHTML = `<div class="empty-state">Something went wrong. <a href="#/">Back to search</a></div>`;
    return;
  }

  const latest = r.latestEvent;
  const freshnessTierClass = `tier-${r.freshness.tier}`;

  let badgeHtml;
  if (latest && latest.type === "rating") {
    badgeHtml = `<div class="score-badge ${scoreTierClass(latest.score)}">
        <div class="score-num">${escapeHtml(formatScore(latest.score))}</div>
        <div class="score-cat">Municipal rating</div>
      </div>`;
  } else if (latest && latest.type === "raid") {
    badgeHtml = `<div class="score-badge tier-raid">
        <div class="score-cat">Raid reported</div>
      </div>`;
  } else {
    badgeHtml = `<div class="score-badge tier-none">
        <div class="score-cat">No data</div>
      </div>`;
  }

  const events = Array.isArray(r.events) ? r.events : [];

  app.innerHTML = `
    <span class="back-link" id="back-link">&larr; Back to search</span>
    <div class="profile-card">
      <div class="profile-header">
        <div>
          <h2>${escapeHtml(r.name)}</h2>
          <div class="profile-address">${escapeHtml(r.area)}${r.restaurantType ? ` · ${escapeHtml(r.restaurantType)}` : ""}</div>
        </div>
        ${badgeHtml}
      </div>

      <div class="freshness-row ${freshnessTierClass}">
        <div class="label">${escapeHtml(r.freshness.label)}</div>
        <div class="detail">${escapeHtml(r.freshness.detail)}</div>
      </div>

      <div class="source-line">
        Inclusion here means a public inspection or raid occurred — it does not by itself mean this restaurant is currently
        unsafe. Every record below links to its original source.
      </div>

      <div class="actions">
        <button class="btn btn-primary" id="request-btn">Request Inspection</button>
        <span class="request-count" id="request-count">${r.requestCount} request${r.requestCount === 1 ? "" : "s"} so far</span>
        <button class="report-error-link" id="report-toggle">Report an error on this listing</button>
      </div>

      <form class="report-form" id="report-form">
        <textarea id="report-message" placeholder="What looks wrong? (e.g. wrong restaurant matched, outdated info, incorrect area)"></textarea>
        <div class="actions">
          <button type="submit" class="btn btn-primary">Submit report</button>
          <span class="toast" id="report-toast"></span>
        </div>
      </form>

      ${events.length ? `
        <h3 class="timeline-heading">Public record (${events.length})</h3>
        <div class="event-list">
          ${events.map(renderEventCard).join("")}
        </div>
      ` : ""}
    </div>
  `;

  document.getElementById("back-link").addEventListener("click", () => {
    window.location.hash = "";
  });

  document.getElementById("request-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const res = await fetch(`/api/restaurants/${encodeURIComponent(r.id)}/request-inspection`, {
        method: "POST",
      });
      const data = await res.json();
      const countEl = document.getElementById("request-count");
      countEl.textContent = `${data.requestCount} request${data.requestCount === 1 ? "" : "s"} so far`;
      btn.textContent = "Request received";
    } catch (err) {
      btn.disabled = false;
    }
  });

  const reportToggle = document.getElementById("report-toggle");
  const reportForm = document.getElementById("report-form");
  reportToggle.addEventListener("click", () => {
    reportForm.classList.toggle("open");
  });

  reportForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = document.getElementById("report-message").value.trim();
    const toast = document.getElementById("report-toast");
    if (!message) return;
    try {
      const res = await fetch(`/api/restaurants/${encodeURIComponent(r.id)}/report-error`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        toast.textContent = "Thanks — we'll look into it.";
        document.getElementById("report-message").value = "";
      } else {
        toast.textContent = "Something went wrong. Please try again.";
      }
    } catch (err) {
      toast.textContent = "Something went wrong. Please try again.";
    }
  });
}
