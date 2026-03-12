const { updateBrother, deleteBrother } = require("../../lib/store");
const { sendJson, parseBody, withErrorHandling } = require("../../lib/http");

module.exports = async (req, res) => {
  await withErrorHandling(res, async () => {
    const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    if (!id) {
      sendJson(res, 400, { error: "ID inválido." });
      return;
    }

    if (req.method === "PUT") {
      const brother = await updateBrother(id, await parseBody(req));
      sendJson(res, 200, brother);
      return;
    }

    if (req.method === "DELETE") {
      await deleteBrother(id);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Método não permitido." });
  });
};
