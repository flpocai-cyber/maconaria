const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data", "store.json");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

async function readStore() {
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const data = JSON.parse(raw);
  data.brothers = Array.isArray(data.brothers) ? data.brothers : [];
  data.sessions = Array.isArray(data.sessions) ? data.sessions : [];
  return data;
}

async function writeStore(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": MIME[".json"] });
  res.end(JSON.stringify(payload));
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function notFound(res) {
  sendJson(res, 404, { error: "Não encontrado." });
}

function validateBrother(input) {
  if (!input.name || !input.cim || !input.degree) return "Nome, CIM e grau são obrigatórios.";
  return null;
}

function validateSession(input) {
  if (!input.datetime || !input.theme || !input.degree) return "Data/hora, tema e grau são obrigatórios.";
  return null;
}

function normalizeBrother(input) {
  return {
    id: input.id || randomUUID(),
    name: String(input.name || "").trim(),
    address: String(input.address || "").trim(),
    phone: String(input.phone || "").trim(),
    birthDate: String(input.birthDate || ""),
    cim: String(input.cim || "").trim(),
    degree: String(input.degree || "").trim(),
    initiationDate: String(input.initiationDate || ""),
    elevationDate: String(input.elevationDate || ""),
    exaltationDate: String(input.exaltationDate || ""),
    emeritoDate: String(input.emeritoDate || ""),
    benemeritoDate: String(input.benemeritoDate || ""),
    wifeName: String(input.wifeName || "").trim(),
    wifeBirthDate: String(input.wifeBirthDate || ""),
    wifePhone: String(input.wifePhone || "").trim()
  };
}

function normalizeSession(input) {
  return {
    id: input.id || randomUUID(),
    datetime: String(input.datetime || ""),
    theme: String(input.theme || "").trim(),
    notes: String(input.notes || "").trim(),
    degree: String(input.degree || "").trim(),
    attendance: Array.isArray(input.attendance) ? input.attendance.map(String) : [],
    visitors: Array.isArray(input.visitors) ? input.visitors.map((visitor) => ({
      id: visitor.id || randomUUID(),
      name: String(visitor.name || "").trim(),
      lodge: String(visitor.lodge || "A.R.L.S.").trim() || "A.R.L.S.",
      city: String(visitor.city || "").trim()
    })) : []
  };
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/store") {
    return sendJson(res, 200, await readStore());
  }

  if (req.method === "POST" && url.pathname === "/api/brothers") {
    const store = await readStore();
    const body = normalizeBrother(await parseBody(req));
    const error = validateBrother(body);
    if (error) return sendJson(res, 400, { error });
    store.brothers.unshift(body);
    await writeStore(store);
    return sendJson(res, 201, body);
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/brothers/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const store = await readStore();
    const body = normalizeBrother({ ...(await parseBody(req)), id });
    const error = validateBrother(body);
    if (error) return sendJson(res, 400, { error });
    store.brothers = store.brothers.map((brother) => brother.id === id ? body : brother);
    await writeStore(store);
    return sendJson(res, 200, body);
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/brothers/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const store = await readStore();
    store.brothers = store.brothers.filter((brother) => brother.id !== id);
    store.sessions = store.sessions.map((session) => ({ ...session, attendance: session.attendance.filter((brotherId) => brotherId !== id) }));
    await writeStore(store);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/sessions") {
    const store = await readStore();
    const body = normalizeSession(await parseBody(req));
    const error = validateSession(body);
    if (error) return sendJson(res, 400, { error });
    store.sessions.unshift(body);
    store.sessions.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    await writeStore(store);
    return sendJson(res, 201, body);
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/sessions/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const store = await readStore();
    const body = normalizeSession({ ...(await parseBody(req)), id });
    const error = validateSession(body);
    if (error) return sendJson(res, 400, { error });
    store.sessions = store.sessions.map((session) => session.id === id ? body : session);
    store.sessions.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    await writeStore(store);
    return sendJson(res, 200, body);
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/sessions/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const store = await readStore();
    store.sessions = store.sessions.filter((session) => session.id !== id);
    await writeStore(store);
    return sendJson(res, 200, { ok: true });
  }

  return notFound(res);
}

async function serveStatic(res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(ROOT, safePath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const ext = path.extname(filePath).toLowerCase();
    const content = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    await serveStatic(res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { error: "Erro interno ao processar a requisição.", details: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:${PORT}`);
});
