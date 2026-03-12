(() => {
  const DETAIL_PATH = "/sessao/detalhes/";

  function absoluteUrl(href) {
    try {
      return new URL(href, window.location.origin).toString();
    } catch {
      return null;
    }
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function textOf(node) {
    return (node?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function findSessionLinks(doc = document) {
    const hrefs = [...doc.querySelectorAll("a[href], button[data-href], [onclick], [data-url]")]
      .map((anchor) => anchor.getAttribute("href"))
      .concat(
        [...doc.querySelectorAll("button[data-href], [data-url]")]
          .map((node) => node.getAttribute("data-href") || node.getAttribute("data-url"))
      )
      .concat(
        [...doc.querySelectorAll("[onclick]")]
          .map((node) => node.getAttribute("onclick"))
      )
      .filter((href) => href && href.includes(DETAIL_PATH))
      .map(absoluteUrl);
    const rawHtml = doc.documentElement?.outerHTML || "";
    const regexMatches = [...rawHtml.matchAll(/\/sessao\/detalhes\/\d+/g)].map((match) => absoluteUrl(match[0]));
    return unique(hrefs.concat(regexMatches));
  }

  function inferSessionMeta(doc, url) {
    const heading = textOf(doc.querySelector("h1, h2, h3"));
    const breadcrumb = [...doc.querySelectorAll("a, span, p, div")]
      .map(textOf)
      .find((text) => /\d{2}\/\d{2}\/\d{4}/.test(text) && text.length < 140);
    return {
      url,
      heading,
      hint: breadcrumb || ""
    };
  }

  async function fetchHtml(url) {
    const response = await fetch(url, {
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" }
    });
    if (!response.ok) throw new Error(`Falha ao abrir ${url}: ${response.status}`);
    return response.text();
  }

  function parseHtml(html) {
    return new DOMParser().parseFromString(html, "text/html");
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }

  async function collectCurrentPageOnly() {
    const html = document.documentElement.outerHTML;
    return [{
      ...inferSessionMeta(document, window.location.href),
      html
    }];
  }

  async function collectFromListing() {
    const links = findSessionLinks(document);
    if (!links.length) {
      throw new Error("Nenhum link de detalhe de sessão foi encontrado nesta página.");
    }

    const sessions = [];
    for (let index = 0; index < links.length; index += 1) {
      const url = links[index];
      console.log(`Coletando ${index + 1}/${links.length}: ${url}`);
      const html = await fetchHtml(url);
      const doc = parseHtml(html);
      sessions.push({
        ...inferSessionMeta(doc, url),
        html
      });
    }
    return sessions;
  }

  async function main() {
    const onDetailPage = window.location.pathname.includes(DETAIL_PATH);
    const payload = {
      source: window.location.origin,
      collectedAt: new Date().toISOString(),
      mode: onDetailPage ? "single-session" : "listing",
      currentPage: window.location.href,
      sessions: onDetailPage ? await collectCurrentPageOnly() : await collectFromListing()
    };

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadJson(`paineldaloja-sessoes-${stamp}.json`, payload);
    console.log(`Extração concluída: ${payload.sessions.length} sessão(ões).`);
  }

  main().catch((error) => {
    console.error(error);
    alert(`Erro na extração: ${error.message}`);
  });
})();
