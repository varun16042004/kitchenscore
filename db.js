// Minimal file-backed data layer for the KitchenScore MVP.
// Deliberately simple (flat JSON files, synchronous-ish access via fs promises)
// per the Project Overview's guidance against premature scaling investment —
// swap for a real database only once usage actually demands it.

const fs = require("fs/promises");
const path = require("path");

const RESTAURANTS_PATH = path.join(__dirname, "data", "restaurants.json");
const REPORTS_PATH = path.join(__dirname, "data", "reports.json");

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function getAllRestaurants() {
  const data = await readJson(RESTAURANTS_PATH);
  return data.restaurants;
}

async function getRestaurantById(id) {
  const restaurants = await getAllRestaurants();
  return restaurants.find((r) => r.id === id) || null;
}

async function searchRestaurants(query) {
  const restaurants = await getAllRestaurants();
  if (!query) return restaurants;
  const q = query.trim().toLowerCase();
  return restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.area.toLowerCase().includes(q) ||
      (r.restaurantType && r.restaurantType.toLowerCase().includes(q))
  );
}

async function incrementRequestCount(id) {
  const data = await readJson(RESTAURANTS_PATH);
  const restaurant = data.restaurants.find((r) => r.id === id);
  if (!restaurant) return null;
  restaurant.requestCount = (restaurant.requestCount || 0) + 1;
  await writeJson(RESTAURANTS_PATH, data);
  return restaurant;
}

async function addErrorReport(report) {
  const data = await readJson(REPORTS_PATH);
  data.errorReports.push(report);
  await writeJson(REPORTS_PATH, data);
  return report;
}

module.exports = {
  getAllRestaurants,
  getRestaurantById,
  searchRestaurants,
  incrementRequestCount,
  addErrorReport,
};
