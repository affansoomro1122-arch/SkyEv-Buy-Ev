// GET  /api/products  -> public product list (everyone)
// POST /api/products  -> check admin passcode
// PUT  /api/products  -> save the whole list (admin passcode required)
// The passcode is the ADMIN_PIN environment variable set in the Netlify dashboard.
import { getStore } from "@netlify/blobs";

const KEY = "products";
const json = (d, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

async function denied(req) {
  const pin = process.env.ADMIN_PIN;
  if (!pin) return json({ error: "ADMIN_PIN is not set in Netlify environment variables." }, 500);
  if (req.headers.get("x-admin-pin") !== pin) {
    await new Promise((r) => setTimeout(r, 700)); // slow down guessing
    return json({ error: "Wrong passcode." }, 401);
  }
  return null;
}

const str = (v, max) => String(v == null ? "" : v).slice(0, max);
const num = (v) => (Number.isFinite(+v) && +v >= 0 ? +v : 0);

function clean(list) {
  if (!Array.isArray(list) || list.length > 300) return null;
  const out = [];
  for (const p of list) {
    if (!p || typeof p !== "object" || !p.id || !p.name) return null;
    const images = (Array.isArray(p.images) ? p.images : [])
      .map((u) => String(u))
      .filter((u) => /^https?:\/\//i.test(u) || u.startsWith("/api/image/"))
      .slice(0, 20);
    const specs = (Array.isArray(p.specs) ? p.specs : [])
      .filter((s) => Array.isArray(s) && s[0] && s[1])
      .map((s) => [str(s[0], 120), str(s[1], 300)])
      .slice(0, 60);
    out.push({
      id: str(p.id, 120),
      name: str(p.name, 200),
      price: num(p.price),
      priceNote: str(p.priceNote, 120),
      booking: num(p.booking),
      createdAt: num(p.createdAt) || Date.now(),
      description: str(p.description, 20000),
      images,
      specs,
    });
  }
  return out;
}

export default async (req) => {
  const store = getStore("skyev-data");

  if (req.method === "GET") {
    const list = await store.get(KEY, { type: "json" });
    return json({ list: list === null || list === undefined ? null : list });
  }

  const no = await denied(req);
  if (no) return no;

  if (req.method === "POST") return json({ ok: true });

  if (req.method === "PUT") {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return json({ error: "Invalid data." }, 400);
    }
    const list = clean(body);
    if (!list) return json({ error: "Invalid product data." }, 400);
    await store.setJSON(KEY, list);
    return json({ ok: true, count: list.length });
  }

  return json({ error: "Method not allowed." }, 405);
};

export const config = { path: "/api/products" };
