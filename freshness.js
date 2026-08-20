// Data-freshness logic. Per the Project Overview, this is "the core safeguard"
// against KitchenScore's single biggest product failure mode: presenting a
// years-old FSSAI rating as if it reflects current kitchen conditions.

const DAY_MS = 1000 * 60 * 60 * 24;

function humanRelativeTime(fromDate, toDate) {
  const diffDays = Math.floor((toDate - fromDate) / DAY_MS);
  if (diffDays < 1) return "today";
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(diffDays / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

// tier: fresh | recent | dated | stale | none
function getFreshness(inspectionDateStr, now = new Date()) {
  if (!inspectionDateStr) {
    return {
      tier: "none",
      label: "No inspection data on file",
      detail: "KitchenScore has no official FSSAI record for this restaurant yet.",
    };
  }

  const inspectionDate = new Date(inspectionDateStr + "T00:00:00Z");
  const diffDays = Math.floor((now - inspectionDate) / DAY_MS);
  const relative = humanRelativeTime(inspectionDate, now);

  if (diffDays <= 180) {
    return {
      tier: "fresh",
      label: `Last inspected ${relative}`,
      detail: "Recently inspected — this data reflects current conditions.",
    };
  }
  if (diffDays <= 365) {
    return {
      tier: "recent",
      label: `Last inspected ${relative}`,
      detail: "Inspected within the past year.",
    };
  }
  if (diffDays <= 1095) {
    return {
      tier: "dated",
      label: `Last inspected ${relative}`,
      detail: "This record is getting dated — conditions may have changed since.",
    };
  }
  return {
    tier: "stale",
    label: `Last inspected ${relative}`,
    detail: "This record is significantly outdated. Consider requesting a fresh, independent inspection.",
  };
}

module.exports = { getFreshness, humanRelativeTime };
