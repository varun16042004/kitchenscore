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

function scoreTierClass(category) {
  switch (category) {
    case "Excellent":
    case "Good":
      return "tier-fresh";
    case "Average":
      return "tier-recent";
    case "Needs Improvement":
      return "tier-dated";
    case "Poor":
      return "tier-stale";
    default:
      return "tier-none";
  }
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
      <p>Search official FSSAI hygiene inspection records for Hyderabad restaurants.</p>
      <form class="search-box" id="search-form">
        <input type="text" id="search-input" placeholder="Search by restaurant name or area…" value="${escapeHtml(query)}" autofocus />
        <button type="submit">Search</button>
      </form>
      <div class="demo-banner">
        This build is running on sample/demo data for development. No entry here reflects a real FSSAI inspection of a real restaurant.
      </div>
    </div>
    <div class="results-list" id="results-list"></div>
    <div class="disclaimer">
      KitchenScore is an independent project that surfaces official FSSAI Hygiene Rating Scheme data, clearly sourced and dated.
      It is not affiliated with FSSAI or any government agency, and does not itself certify any restaurant as safe or unsafe.
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
        const scoreLabel = r.rating ? `${r.rating.score}` : "No data";
        const tierClass = r.rating ? scoreTierClass(r.rating.category) : "tier-none";
        return `
          <a class="result-card" href="#/restaurant/${encodeURIComponent(r.id)}">
            <div class="result-top">
              <div>
                <div class="result-name">${escapeHtml(r.name)}</div>
                <div class="result-area">${escapeHtml(r.area)}</div>
              </div>
              <div class="score-pill ${tierClass}">${escapeHtml(scoreLabel)}</div>
            </div>
          </a>
        `;
      })
      .join("");
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Something went wrong loading results. Please try again.</div>`;
  }
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

  const tierClass = r.rating ? scoreTierClass(r.rating.category) : "tier-none";
  const freshnessTierClass = `tier-${r.freshness.tier}`;

  app.innerHTML = `
    <span class="back-link" id="back-link">&larr; Back to search</span>
    <div class="profile-card">
      <div class="profile-header">
        <div>
          <h2>${escapeHtml(r.name)}</h2>
          <div class="profile-address">${escapeHtml(r.address)}</div>
        </div>
        ${
          r.rating
            ? `<div class="score-badge ${tierClass}">
                <div class="score-num">${escapeHtml(String(r.rating.score))}</div>
                <div class="score-cat">${escapeHtml(r.rating.category)}</div>
              </div>`
            : `<div class="score-badge tier-none">
                <div class="score-cat">No data</div>
              </div>`
        }
      </div>

      <div class="freshness-row ${freshnessTierClass}">
        <div class="label">${escapeHtml(r.freshness.label)}</div>
        <div class="detail">${escapeHtml(r.freshness.detail)}</div>
      </div>

      <div class="source-line">
        ${
          r.rating
            ? `Source: ${escapeHtml(r.rating.source)}${r.isDemoData ? " (demo data)" : ""}`
            : `No official record on file yet${r.isDemoData ? " (demo data)" : ""}. This is an absence of data, not a finding.`
        }
      </div>

      <div class="actions">
        <button class="btn btn-primary" id="request-btn">Request Inspection</button>
        <span class="request-count" id="request-count">${r.requestCount} request${r.requestCount === 1 ? "" : "s"} so far</span>
        <button class="report-error-link" id="report-toggle">Report an error on this listing</button>
      </div>

      <form class="report-form" id="report-form">
        <textarea id="report-message" placeholder="What looks wrong? (e.g. wrong restaurant matched, outdated info, incorrect address)"></textarea>
        <div class="actions">
          <button type="submit" class="btn btn-primary">Submit report</button>
          <span class="toast" id="report-toast"></span>
        </div>
      </form>
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
