// Data-freshness logic. Per the Project Overview, this is "the core safeguard"
// against KitchenScore's single biggest product failure mode: presenting an
// old record as if it reflects current kitchen conditions.
//
// KitchenScore tracks two distinct kinds of public record, and the freshness
// label says which one it's talking about rather than implying a generic
// "inspection": a "rating" is a numeric municipal hygiene score (from CMC); a
// "raid" is an enforcement inspection with no formal score (from CFS
// Telangana / Malkajgiri task forces). Conflating the two would misrepresent
// a one-off enforcement action as an ongoing rating, or vice versa.

const DAY_MS = 1000 * 60 * 60 * 24;

const TYPE_NOUN = {
  rating: "rating",
  raid: "raid",
};

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
// eventType: "rating" | "raid" | null/undefined (unknown)
function getFreshness(dateStr, eventType, now = new Date()) {
  const noun = TYPE_NOUN[eventType] || "public record";

  if (!dateStr) {
    return {
      tier: "none",
      label: "No public record on file",
      detail: "KitchenScore has no publicly reported rating or raid for this restaurant yet.",
    };
  }

  const eventDate = new Date(dateStr + "T00:00:00Z");
  const diffDays = Math.floor((now - eventDate) / DAY_MS);
  const relative = humanRelativeTime(eventDate, now);
  const label = `Last public ${noun} ${relative}`;

  if (diffDays <= 180) {
    return {
      tier: "fresh",
      label,
      detail: eventType === "raid"
        ? "Recently reported — this may not reflect any changes made since."
        : "Recently published — this data reflects a relatively current record.",
    };
  }
  if (diffDays <= 365) {
    return {
      tier: "recent",
      label,
      detail: `This ${noun === "public record" ? "record" : noun} is within the past year.`,
    };
  }
  if (diffDays <= 1095) {
    return {
      tier: "dated",
      label,
      detail: "This record is getting dated — conditions may have changed since.",
    };
  }
  return {
    tier: "stale",
    label,
    detail: "This record is significantly outdated. Consider requesting a fresh, independent inspection.",
  };
}

module.exports = { getFreshness, humanRelativeTime };
