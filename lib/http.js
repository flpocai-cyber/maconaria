function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function withErrorHandling(res, action) {
  try {
    await action();
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Erro interno." });
  }
}

module.exports = { sendJson, parseBody, withErrorHandling };
