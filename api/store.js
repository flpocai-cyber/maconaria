const { loadStore } = require("../lib/store");
const { sendJson, withErrorHandling } = require("../lib/http");

module.exports = async (req, res) => {
  await withErrorHandling(res, async () => {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Método não permitido." });
      return;
    }
    sendJson(res, 200, await loadStore());
  });
};
