const { createBrother } = require("../../lib/store");
const { sendJson, parseBody, withErrorHandling } = require("../../lib/http");

module.exports = async (req, res) => {
  await withErrorHandling(res, async () => {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Método não permitido." });
      return;
    }
    const brother = await createBrother(await parseBody(req));
    sendJson(res, 201, brother);
  });
};
