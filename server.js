const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const db = require("./db");
const { getFreshness } = require("./freshness");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function serializeRestaurant(r) {
  return {
    id: r.id,
    name: r.name,
    area: r.area,
    address: r.address,
    fssaiLicense: r.fssaiLicense,
    isDemoData: !!r.isDemoData,
    rating: r.rating,
    freshness: getFreshness(r.rating ? r.rating.inspectionDate : null),
    requestCount: r.requestCount || 0,
  };
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === "/" ? "/index.html" : pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(PUBLIC_DIR, filePath);

  // Prevent path traversal outside the public directory.
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        // SPA fallback: unknown paths serve index.html so client-side routing works.
        fs.readFile(path.join(PUBLIC_DIR, "index.html"), (err2, indexContent) => {
          if (err2) {
            res.writeHead(404);
            return res.end("Not found");
          }
          res.writeHead(200, { "Content-Type": MIME[".html"] });
          res.end(indexContent);
        });
        return;
      }
      res.writeHead(500);
      return res.end("Server error");
    }
    const ext = path.extname(fullPath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname, searchParams } = url;

  try {
    // --- API routes ---
    if (pathname === "/api/restaurants" && req.method === "GET") {
      const q = searchParams.get("q") || "";
      const restaurants = await db.searchRestaurants(q);
      return sendJson(res, 200, {
        count: restaurants.length,
        restaurants: restaurants.map(serializeRestaurant),
      });
    }

    const restaurantMatch = pathname.match(/^\/api\/restaurants\/([^/]+)$/);
    if (restaurantMatch && req.method === "GET") {
      const restaurant = await db.getRestaurantById(restaurantMatch[1]);
      if (!restaurant) return sendJson(res, 404, { error: "Restaurant not found" });
      return sendJson(res, 200, serializeRestaurant(restaurant));
    }

    const requestInspectionMatch = pathname.match(/^\/api\/restaurants\/([^/]+)\/request-inspection$/);
    if (requestInspectionMatch && req.method === "POST") {
      const restaurant = await db.incrementRequestCount(requestInspectionMatch[1]);
      if (!restaurant) return sendJson(res, 404, { error: "Restaurant not found" });
      return sendJson(res, 200, {
        id: restaurant.id,
        requestCount: restaurant.requestCount,
      });
    }

    const reportErrorMatch = pathname.match(/^\/api\/restaurants\/([^/]+)\/report-error$/);
    if (reportErrorMatch && req.method === "POST") {
      const restaurant = await db.getRestaurantById(reportErrorMatch[1]);
      if (!restaurant) return sendJson(res, 404, { error: "Restaurant not found" });
      const body = await readBody(req);
      const message = (body.message || "").toString().trim().slice(0, 2000);
      if (!message) return sendJson(res, 400, { error: "message is required" });
      const report = {
        restaurantId: restaurant.id,
        message,
        submittedAt: new Date().toISOString(),
      };
      await db.addErrorReport(report);
      return sendJson(res, 201, { ok: true });
    }

    // --- Static frontend ---
    if (req.method === "GET") {
      return serveStatic(req, res, pathname);
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`KitchenScore MVP running at http://localhost:${PORT}`);
});
