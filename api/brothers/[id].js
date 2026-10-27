const { updateBrother, setBrotherActive } = require("../../lib/store");
const { sendJson, parseBody, withErrorHandling } = require("../../lib/http");

module.exports = async (req, res) => {
  await withErrorHandling(res, async () => {
    const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    if (!id) {
      sendJson(res, 400, { error: "ID inv�lido." });
      return;
    }

    if (req.method === "PUT") {
      const brother = await updateBrother(id, await parseBody(req));
      sendJson(res, 200, brother);
      return;
    }

    if (req.method === "DELETE") {
      const brother = await setBrotherActive(id, false);
      sendJson(res, brother ? 200 : 404, brother || { error: "Irmão não encontrado." });
      return;
    }

    if (req.method === "PATCH") {
      const body = await parseBody(req);
      const brother = await setBrotherActive(id, body.active === true);
      sendJson(res, brother ? 200 : 404, brother || { error: "Irmão não encontrado." });
      return;
    }

    sendJson(res, 405, { error: "M�todo n�o permitido." });
  });
};

