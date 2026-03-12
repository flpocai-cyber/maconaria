const { createSession } = require("../../lib/store");
const { sendJson, parseBody, withErrorHandling } = require("../../lib/http");

module.exports = async (req, res) => {
  await withErrorHandling(res, async () => {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Método não permitido." });
      return;
    }
    const session = await createSession(await parseBody(req));
    sendJson(res, 201, session);
  });
};
