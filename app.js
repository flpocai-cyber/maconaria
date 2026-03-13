const SESSION_LEVELS = [
  { value: "aprendiz", label: "Aprendiz" },
  { value: "companheiro", label: "Companheiro" },
  { value: "mestre", label: "Mestre" }
];

const BROTHER_LEVELS = {
  aprendiz: "Aprendiz",
  companheiro: "Companheiro",
  mestre: "Mestre"
};

const REPORT_FIELDS = [
  { key: "name", label: "Nome" },
  { key: "treatmentName", label: "Tratamento" },
  { key: "degree", label: "Grau" },
  { key: "cim", label: "CIM" },
  { key: "cpf", label: "CPF" },
  { key: "email", label: "E-mail" },
  { key: "address", label: "Endere\u00e7o" },
  { key: "phone", label: "Telefone" },
  { key: "wife", label: "Esposa" },
  { key: "emeritoDate", label: "Em\u00e9rito" },
  { key: "benemeritoDate", label: "Benem\u00e9rito" }
];

const PIE_COLORS = {
  aprendiz: "#d8a62f",
  companheiro: "#0f8c8c",
  mestre: "#2c7be5",
  faltas: "#d44c4c"
};

let state = { brothers: [], sessions: [] };

function qs(selector, scope = document) { return scope.querySelector(selector); }
function qsa(selector, scope = document) { return [...scope.querySelectorAll(selector)]; }
function getDegreeLabel(value) { return BROTHER_LEVELS[value] || value || "-"; }
function sortSessions() { state.sessions.sort((a, b) => new Date(b.datetime) - new Date(a.datetime)); }
function canAttendSession(brotherDegree, sessionDegree) {
  const order = { aprendiz: 1, companheiro: 2, mestre: 3 };
  return order[brotherDegree] >= order[sessionDegree];
}
function getEligibleBrothers(sessionDegree) {
  return state.brothers.filter((brother) => canAttendSession(brother.degree, sessionDegree));
}
function formatDate(value, withTime = false) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", withTime ? { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}
function escapeHtml(value) {
  return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function monthLabel(date) { return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date); }
function capitalize(value) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : ""; }
function getStoredTheme() { return localStorage.getItem("theme-mode") || "light"; }
function applyTheme(mode) {
  document.body.dataset.theme = mode;
  const icon = qs("#themeToggleIcon");
  if (icon) icon.textContent = mode === "dark" ? "☀" : "☾";
}
function normalizeBrokenText(value) {
  const source = String(value || "");
  const replacements = [
    ["Sess?o", "Sessão"],
    ["Ordin?ria", "Ordinária"],
    ["1? INSTRU??O", "1ª INSTRUÇÃO"],
    ["?ltima", "Última"],
    ["Apresenta??o", "Apresentação"],
    ["Gr?o", "Grão"],
    ["Jos?", "José"],
    ["F?bio", "Fábio"],
    ["Cons?rcio", "Consórcio"],
    ["Elei??o", "Eleição"],
    ["Eleva??o", "Elevação"],
    ["Escrut?nio", "Escrutínio"],
    ["Exalta??o", "Exaltação"],
    ["Inicia??o", "Iniciação"],
    ["Instala??o", "Instalação"],
    ["Jantar Ritual?stico", "Jantar Ritualístico"],
    ["M?rcio", "Márcio"],
    ["Semin?rio", "Seminário"],
    ["Sal?rio", "Salário"],
    ["L?o", "Léo"],
    ["?caro", "Ícaro"],
    ["Esperan?a", "Esperança"],
    ["M?rio", "Mário"],
    ["Cansa?o", "Cansaço"],
    ["D? Bola", "Dó Bola"],
    ["Palet?ica", "Paletóica"],
    ["Vota??o M?tua", "Votação Mútua"],
    ["M?tua", "Mútua"],
    ["Cl?vis", "Clóvis"]
  ];
  return replacements.reduce((text, [from, to]) => text.replaceAll(from, to), source);
}

function textField(name, label, value = "", required = false, className = "field") {
  return `<div class="${className}"><label for="${name}">${label}</label><input id="${name}" name="${name}" value="${escapeHtml(value)}" ${required ? "required" : ""}></div>`;
}
function dateField(name, label, value = "", required = false, className = "field") {
  return `<div class="${className}"><label for="${name}">${label}</label><input type="date" id="${name}" name="${name}" value="${escapeHtml(value)}" ${required ? "required" : ""}></div>`;
}
function datetimeField(name, label, value = "", required = false, className = "field") {
  return `<div class="${className}"><label for="${name}">${label}</label><input type="datetime-local" id="${name}" name="${name}" value="${escapeHtml(value)}" ${required ? "required" : ""}></div>`;
}
function textareaField(name, label, value = "", className = "field") {
  return `<div class="${className}"><label for="${name}">${label}</label><textarea id="${name}" name="${name}">${escapeHtml(value)}</textarea></div>`;
}
function selectField(name, label, options, value = "", required = false, className = "field") {
  return `<div class="${className}"><label for="${name}">${label}</label><select id="${name}" name="${name}" ${required ? "required" : ""}>${options.map((option) => `<option value="${option.value}" ${option.value === value ? "selected" : ""}>${option.label}</option>`).join("")}</select></div>`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.error || "Erro ao salvar dados.");
  return data;
}

async function loadState() {
  state = await api("/api/store");
  sortSessions();
}

function showMessage(message) { window.alert(message); }

function buildBirthdayEvent(name, type, dateString, year, today) {
  const source = new Date(`${dateString}T00:00`);
  if (Number.isNaN(source.getTime())) return null;
  let nextDate = new Date(year, source.getMonth(), source.getDate());
  if (nextDate < today) nextDate = new Date(year + 1, source.getMonth(), source.getDate());
  return { name, type, sortKey: nextDate.getTime(), yearReference: nextDate.getFullYear(), month: nextDate.getMonth(), day: String(nextDate.getDate()).padStart(2, "0"), dateLabel: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(nextDate) };
}

function collectBirthdayEvents() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const year = now.getFullYear();
  const events = [];
  state.brothers.forEach((brother) => {
    if (brother.birthDate) events.push(buildBirthdayEvent(brother.name, "Irm\u00e3o do quadro", brother.birthDate, year, today));
    if (brother.wifeName && brother.wifeBirthDate) events.push(buildBirthdayEvent(brother.wifeName, `Esposa de ${brother.name}`, brother.wifeBirthDate, year, today));
  });
  return events.filter(Boolean).sort((a, b) => a.sortKey - b.sortKey);
}

function calculateGlobalAttendanceRate() {
  let totalPossible = 0;
  let totalPresent = 0;
  state.brothers.forEach((brother) => {
    totalPossible += state.sessions.filter((session) => canAttendSession(brother.degree, session.degree)).length;
  });
  state.sessions.forEach((session) => { totalPresent += session.attendance.length; });
  return totalPossible ? Math.round((totalPresent / totalPossible) * 100) : 0;
}

function getPeriodSessions(months) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  return state.sessions.filter((session) => new Date(session.datetime) >= start);
}

function renderPieChart(element, legendElement, items) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (!total) {
    element.style.background = "conic-gradient(#dfe7f1 0deg 360deg)";
    legendElement.innerHTML = '<div class="empty-state">Sem dados suficientes para o gr\u00e1fico.</div>';
    return;
  }
  let current = 0;
  const segments = items.map((item) => {
    const next = current + (item.value / total) * 360;
    const segment = `${item.color} ${current}deg ${next}deg`;
    current = next;
    return segment;
  });
  element.style.background = `conic-gradient(${segments.join(", ")})`;
  legendElement.innerHTML = items.map((item) => `<div class="legend-item"><div><span class="legend-swatch" style="background:${item.color}"></span>${escapeHtml(item.label)}</div><strong>${item.value}</strong></div>`).join("");
}

function renderShell() {
  qs("#todayLabel").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date());
  applyTheme(getStoredTheme());
  qs("#themeToggle").onclick = () => {
    const next = document.body.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme-mode", next);
    applyTheme(next);
  };
  qsa(".menu-link").forEach((button) => {
    button.onclick = () => {
      qsa(".menu-link").forEach((item) => {
        item.classList.remove("active");
        item.classList.remove("active-nav-item");
      });
      qsa(".view").forEach((view) => view.classList.remove("active"));
      button.classList.add("active");
      button.classList.add("active-nav-item");
      qs(`#${button.dataset.view}`).classList.add("active");
    };
  });
}

function renderDashboard() {
  qs("#dashboard").innerHTML = qs("#dashboardTemplate").innerHTML;
  qs("#brothersCount").textContent = state.brothers.length;
  qs("#sessionsCount").textContent = state.sessions.length;
  qs("#visitorsCount").textContent = state.sessions.reduce((sum, session) => sum + session.visitors.length, 0);
  qs("#dashboardGreeting").textContent = `Frequ\u00eancia geral de ${calculateGlobalAttendanceRate()}%`;
  qs("#dashboardSubtitle").textContent = "Resumo de sess\u00f5es, visitantes e anivers\u00e1rios do quadro.";

  const totals = { aprendiz: 0, companheiro: 0, mestre: 0 };
  state.sessions.forEach((session) => { totals[session.degree] += 1; });
  qs("#dashboardPieTotal").textContent = state.sessions.length;
  renderPieChart(qs("#dashboardPie"), qs("#dashboardLegend"), [
    { label: "Sess\u00f5es de Aprendiz", value: totals.aprendiz, color: PIE_COLORS.aprendiz },
    { label: "Sess\u00f5es de Companheiro", value: totals.companheiro, color: PIE_COLORS.companheiro },
    { label: "Sess\u00f5es de Mestre", value: totals.mestre, color: PIE_COLORS.mestre }
  ]);

  const upcoming = collectBirthdayEvents().slice(0, 6);
  qs("#birthdayHighlights").innerHTML = upcoming.length ? upcoming.map((item) => `<div class="birthday-row"><div><strong>${escapeHtml(item.name)}</strong><div class="muted">${escapeHtml(item.type)}</div></div><strong>${item.dateLabel}</strong></div>`).join("") : '<div class="empty-state">Nenhum anivers\u00e1rio cadastrado.</div>';
  renderBirthdayCalendar(qs("#dashboardCalendar"), 4);
}
function renderBrothers() {
  qs("#brothers").innerHTML = qs("#brothersTemplate").innerHTML;
  buildBrotherForm();
  buildBrothersTable("");
  const renderFilteredBrothers = () => buildBrothersTable(qs("#brotherSearch").value);
  qs("#brotherSearch").addEventListener("input", renderFilteredBrothers);
  qs("#brotherDegreeFilter").addEventListener("change", renderFilteredBrothers);
  qs("#brotherFilterBtn").onclick = renderFilteredBrothers;
  qs("#openBrotherFormBtn").onclick = () => {
    buildBrotherForm();
    qs("#brotherFormCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
}

function buildBrotherForm(editId = "") {
  const brother = state.brothers.find((item) => item.id === editId) || {};
  qs("#brotherForm").innerHTML = `
    ${textField("name", "Nome", brother.name, true)}
    ${textField("treatmentName", "Nome de tratamento", brother.treatmentName)}
    ${textField("cim", "CIM", brother.cim, true)}
    ${textField("cpf", "CPF", brother.cpf)}
    ${textField("email", "E-mail", brother.email)}
    ${textField("address", "Endere\u00e7o", brother.address, true, "field-wide")}
    ${textField("phone", "Telefone", brother.phone, true)}
    ${dateField("birthDate", "Data de nascimento", brother.birthDate, true)}
    ${selectField("degree", "Grau", SESSION_LEVELS, brother.degree || "aprendiz", true)}
    ${dateField("initiationDate", "Data de Inicia\u00e7\u00e3o", brother.initiationDate)}
    ${dateField("elevationDate", "Data de Eleva\u00e7\u00e3o", brother.elevationDate)}
    ${dateField("exaltationDate", "Data de Exalta\u00e7\u00e3o", brother.exaltationDate)}
    ${dateField("emeritoDate", "Data de Em\u00e9rito", brother.emeritoDate)}
    ${dateField("benemeritoDate", "Data de Benem\u00e9rito", brother.benemeritoDate)}
    <div class="field-wide"><label>Esposa</label></div>
    ${textField("wifeName", "Nome da esposa", brother.wifeName)}
    ${dateField("wifeBirthDate", "Anivers\u00e1rio da esposa", brother.wifeBirthDate)}
    ${textField("wifePhone", "Telefone da esposa", brother.wifePhone)}
    <input type="hidden" name="id" value="${escapeHtml(editId)}">
    <div class="form-actions">
      <button type="submit" class="btn">${editId ? "Salvar altera\u00e7\u00f5es" : "Cadastrar irm\u00e3o"}</button>
      <button type="button" class="btn-secondary" id="resetBrotherForm">Limpar</button>
    </div>
  `;

  qs("#brotherForm").onsubmit = async (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload = {
      name: formData.name.trim(),
      treatmentName: formData.treatmentName.trim(),
      address: formData.address.trim(),
      phone: formData.phone.trim(),
      birthDate: formData.birthDate,
      cim: formData.cim.trim(),
      cpf: formData.cpf.trim(),
      email: formData.email.trim(),
      degree: formData.degree,
      initiationDate: formData.initiationDate,
      elevationDate: formData.elevationDate,
      exaltationDate: formData.exaltationDate,
      emeritoDate: formData.emeritoDate,
      benemeritoDate: formData.benemeritoDate,
      wifeName: formData.wifeName.trim(),
      wifeBirthDate: formData.wifeBirthDate,
      wifePhone: formData.wifePhone.trim()
    };

    try {
      if (formData.id) await api(`/api/brothers/${formData.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/api/brothers", { method: "POST", body: JSON.stringify(payload) });
      await loadState();
      render();
    } catch (error) {
      showMessage(error.message);
    }
  };

  qs("#resetBrotherForm").onclick = () => buildBrotherForm();
}

function buildBrothersTable(searchTerm) {
  const term = searchTerm.trim().toLowerCase();
  const selectedDegree = qs("#brotherDegreeFilter")?.value || "";
  const brothers = state.brothers.filter((brother) => {
    const matchesTerm = [brother.name, brother.treatmentName, brother.cim, brother.cpf, brother.email, getDegreeLabel(brother.degree)].some((value) => String(value).toLowerCase().includes(term));
    const matchesDegree = !selectedDegree || brother.degree === selectedDegree;
    return matchesTerm && matchesDegree;
  });
  qs("#brothersTable").innerHTML = brothers.length ? `
    <div class="table-wrap brothers-table-wrap">
      <table class="brothers-table">
        <thead><tr><th>Nome</th><th>Grau</th><th>CIM</th><th>Op\u00e7\u00f5es</th></tr></thead>
        <tbody>
          ${brothers.map((brother) => `
            <tr>
              <td><strong>${escapeHtml(brother.name)}</strong></td>
              <td><span class="badge ${brother.degree}">${escapeHtml(getDegreeLabel(brother.degree))}</span></td>
              <td>${escapeHtml(brother.cim)}</td>
              <td>
                <div class="session-actions">
                  <button class="table-action-btn" data-show-brother="${brother.id}">Detalhes</button>
                  <button class="table-action-btn" data-edit-brother="${brother.id}">Editar</button>
                  <button class="table-action-btn danger" data-delete-brother="${brother.id}">Excluir</button>
                </div>
              </td>
            </tr>
            <tr class="brother-detail-row hidden" data-brother-detail="${brother.id}">
              <td colspan="4">
                <div class="brother-inline-detail">
                  <div class="brother-detail-block">
                    <strong>Dados do irm\u00e3o</strong>
                    <div class="brother-detail-grid">
                      <div><span class="muted">Nome</span><strong>${escapeHtml(brother.name || "-")}</strong></div>
                      <div><span class="muted">Tratamento</span><strong>${escapeHtml(brother.treatmentName || "-")}</strong></div>
                      <div><span class="muted">Grau</span><strong>${escapeHtml(getDegreeLabel(brother.degree))}</strong></div>
                      <div><span class="muted">CIM</span><strong>${escapeHtml(brother.cim || "-")}</strong></div>
                      <div><span class="muted">CPF</span><strong>${escapeHtml(brother.cpf || "-")}</strong></div>
                      <div><span class="muted">Nascimento</span><strong>${escapeHtml(formatDate(brother.birthDate))}</strong></div>
                      <div><span class="muted">Telefone</span><strong>${escapeHtml(brother.phone || "-")}</strong></div>
                      <div><span class="muted">E-mail</span><strong>${escapeHtml(brother.email || "-")}</strong></div>
                      <div class="detail-span-2"><span class="muted">Endere\u00e7o</span><strong>${escapeHtml(brother.address || "-")}</strong></div>
                      <div><span class="muted">Inicia\u00e7\u00e3o</span><strong>${escapeHtml(formatDate(brother.initiationDate))}</strong></div>
                      <div><span class="muted">Eleva\u00e7\u00e3o</span><strong>${escapeHtml(formatDate(brother.elevationDate))}</strong></div>
                      <div><span class="muted">Exalta\u00e7\u00e3o</span><strong>${escapeHtml(formatDate(brother.exaltationDate))}</strong></div>
                      <div><span class="muted">Em\u00e9rito</span><strong>${escapeHtml(formatDate(brother.emeritoDate))}</strong></div>
                      <div><span class="muted">Benem\u00e9rito</span><strong>${escapeHtml(formatDate(brother.benemeritoDate))}</strong></div>
                    </div>
                  </div>
                  <div class="brother-detail-block">
                    <strong>Esposa</strong>
                    <div class="brother-detail-grid">
                      <div><span class="muted">Nome</span><strong>${escapeHtml(brother.wifeName || "-")}</strong></div>
                      <div><span class="muted">Nascimento</span><strong>${escapeHtml(formatDate(brother.wifeBirthDate))}</strong></div>
                      <div><span class="muted">Telefone</span><strong>${escapeHtml(brother.wifePhone || "-")}</strong></div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  ` : '<div class="empty-state">Nenhum irm\u00e3o encontrado.</div>';

  qsa("[data-show-brother]").forEach((button) => {
    button.onclick = () => {
      const row = qs(`[data-brother-detail="${button.dataset.showBrother}"]`);
      row?.classList.toggle("hidden");
      button.textContent = row?.classList.contains("hidden") ? "Detalhes" : "Ocultar";
    };
  });
  qsa("[data-edit-brother]").forEach((button) => {
    button.onclick = () => {
      buildBrotherForm(button.dataset.editBrother);
      qs("#brotherFormCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  });
  qsa("[data-delete-brother]").forEach((button) => {
    button.onclick = async () => {
      try {
        await api(`/api/brothers/${button.dataset.deleteBrother}`, { method: "DELETE" });
        await loadState();
        render();
      } catch (error) {
        showMessage(error.message);
      }
    };
  });
}

function renderSessions() {
  qs("#sessions").innerHTML = qs("#sessionsTemplate").innerHTML;
  buildSessionForm();
  buildSessionsList("");
  const renderFilteredSessions = () => buildSessionsList(qs("#sessionSearch").value);
  qs("#sessionSearch").addEventListener("input", renderFilteredSessions);
  qs("#sessionDateFrom").addEventListener("change", renderFilteredSessions);
  qs("#sessionDateTo").addEventListener("change", renderFilteredSessions);
  qs("#sessionFilterBtn").onclick = renderFilteredSessions;
  qs("#openSessionFormBtn").onclick = () => {
    buildSessionForm();
    qs("#sessionFormCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
}

function buildSessionForm(editId = "", draft = null) {
  const session = draft || state.sessions.find((item) => item.id === editId) || { degree: "aprendiz", attendance: [], visitors: [] };
  const eligible = getEligibleBrothers(session.degree);
  let visitors = [...(session.visitors || [])];
  const isDarkTheme = document.body.dataset.theme === "dark";
  const darkPanelStyle = isDarkTheme ? ' style="background:#0f172a;border-color:#243247;"' : "";
  const darkSecondaryButtonStyle = isDarkTheme ? ' style="background:linear-gradient(135deg,#8a0000,#b00000);color:#ffffff;border:1px solid rgba(255,255,255,0.08);opacity:1;-webkit-appearance:none;appearance:none;"' : "";

  qs("#sessionForm").innerHTML = `
    ${datetimeField("datetime", "Data e hora", session.datetime, true)}
    ${selectField("degree", "Grau da sess\u00e3o", SESSION_LEVELS, session.degree, true)}
    ${textField("theme", "Tema", normalizeBrokenText(session.theme), true)}
    ${textareaField("notes", "Observa\u00e7\u00f5es", normalizeBrokenText(session.notes), "field-wide")}
    <div class="field-wide"><label>Irm\u00e3os aptos para presen\u00e7a</label><div class="attendees-panel"${darkPanelStyle}><div class="attendee-grid">${eligible.length ? eligible.map((brother) => `<div class="attendee-row"><div><strong>${escapeHtml(brother.name)}</strong><div class="muted">${escapeHtml(getDegreeLabel(brother.degree))} \u2022 CIM ${escapeHtml(brother.cim)}</div></div><label><input type="checkbox" name="attendance" value="${brother.id}" ${session.attendance.includes(brother.id) ? "checked" : ""}> Presente</label></div>`).join("") : '<div class="empty-state">Nenhum irm\u00e3o apto para este grau.</div>'}</div></div></div>
    <div class="field-wide"><label>Visitantes</label><div class="visitors-panel"${darkPanelStyle}><div id="visitorsEditor"></div><div class="visitor-form-inline"${darkPanelStyle}><input id="visitorName" placeholder="Nome do visitante"><input id="visitorLodge" placeholder="A.R.L.S."><input id="visitorCity" placeholder="Cidade"><button type="button" class="btn-secondary" id="addVisitorBtn"${darkSecondaryButtonStyle}>Adicionar visitante</button></div></div></div>
    <input type="hidden" name="id" value="${escapeHtml(editId)}">
    <div class="form-actions"><button type="submit" class="btn">${editId ? "Salvar sess\u00e3o" : "Cadastrar sess\u00e3o"}</button><button type="button" class="btn-secondary" id="resetSessionForm"${darkSecondaryButtonStyle}>Limpar</button></div>
  `;

  function renderVisitorsEditor() {
    qs("#visitorsEditor").innerHTML = visitors.length ? `<div class="visitor-grid">${visitors.map((visitor) => `<div class="visitor-row"><div><strong>${escapeHtml(visitor.name)}</strong><div class="muted">${escapeHtml(visitor.lodge || "A.R.L.S.")} \u2022 ${escapeHtml(visitor.city || "-")}</div></div><button type="button" class="btn-secondary" data-remove-visitor="${visitor.id}">Remover</button></div>`).join("")}</div>` : '<div class="empty-state">Nenhum visitante lan\u00e7ado nesta sess\u00e3o.</div>';
    qsa("[data-remove-visitor]", qs("#visitorsEditor")).forEach((button) => {
      button.onclick = () => {
        visitors = visitors.filter((item) => item.id !== button.dataset.removeVisitor);
        renderVisitorsEditor();
      };
    });
  }

  renderVisitorsEditor();
  qs("#addVisitorBtn").onclick = () => {
    const name = qs("#visitorName").value.trim();
    const lodge = qs("#visitorLodge").value.trim() || "A.R.L.S.";
    const city = qs("#visitorCity").value.trim();
    if (!name) return;
    visitors.push({ id: crypto.randomUUID(), name, lodge, city });
    qs("#visitorName").value = "";
    qs("#visitorLodge").value = "";
    qs("#visitorCity").value = "";
    renderVisitorsEditor();
  };

  qs("#degree").onchange = (event) => {
    const checkedAttendance = qsa('input[name="attendance"]:checked', qs("#sessionForm")).map((input) => input.value);
    buildSessionForm(editId, { ...session, degree: event.target.value, attendance: checkedAttendance, visitors, datetime: qs("#datetime").value, theme: qs("#theme").value, notes: qs("#notes").value });
  };

  qs("#sessionForm").onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      datetime: form.get("datetime"),
      degree: form.get("degree"),
      theme: String(form.get("theme") || "").trim(),
      notes: String(form.get("notes") || "").trim(),
      attendance: form.getAll("attendance"),
      visitors
    };

    try {
      if (form.get("id")) await api(`/api/sessions/${form.get("id")}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/api/sessions", { method: "POST", body: JSON.stringify(payload) });
      await loadState();
      render();
    } catch (error) {
      showMessage(error.message);
    }
  };

  qs("#resetSessionForm").onclick = () => buildSessionForm();
}
function buildSessionsList(searchTerm) {
  const term = searchTerm.trim().toLowerCase();
  const dateFrom = qs("#sessionDateFrom")?.value;
  const dateTo = qs("#sessionDateTo")?.value;
  const sessions = state.sessions.filter((session) => {
    const matchesTerm = [session.theme, session.notes, getDegreeLabel(session.degree)].some((value) => String(value).toLowerCase().includes(term));
    if (!matchesTerm) return false;
    const sessionDate = session.datetime ? session.datetime.slice(0, 10) : "";
    if (dateFrom && sessionDate < dateFrom) return false;
    if (dateTo && sessionDate > dateTo) return false;
    return true;
  });
  qs("#sessionsList").innerHTML = sessions.length ? `
    <div class="table-wrap sessions-table-wrap">
      <table class="sessions-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>T&iacute;tulo</th>
            <th>Presen&ccedil;a</th>
            <th>Visitantes</th>
            <th>Grau</th>
            <th>Op&ccedil;&otilde;es</th>
          </tr>
        </thead>
        <tbody>
          ${sessions.map((session) => `
            <tr>
              <td class="sessions-date-cell">${formatDate(session.datetime)}</td>
              <td>
                <div class="sessions-title-main">${escapeHtml(normalizeBrokenText(session.theme))}</div>
                <div class="sessions-title-sub">${escapeHtml(normalizeBrokenText(session.notes || "Sem observa\u00e7\u00f5es."))}</div>
                <div class="sessions-title-meta">${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(session.datetime))} - ${escapeHtml(getDegreeLabel(session.degree))}</div>
              </td>
              <td class="sessions-numeric-cell">${session.attendance.length}</td>
              <td class="sessions-numeric-cell">${session.visitors.length}</td>
              <td><span class="badge ${session.degree}">${escapeHtml(getDegreeLabel(session.degree))}</span></td>
              <td>
                <div class="session-actions">
                  <button class="table-action-btn" data-show-session="${session.id}">Detalhes</button>
                  <button class="table-action-btn" data-edit-session="${session.id}">Editar</button>
                  <button class="table-action-btn danger" data-delete-session="${session.id}">Excluir</button>
                </div>
              </td>
            </tr>
            <tr class="session-detail-row hidden" data-session-detail="${session.id}">
              <td colspan="6">
                <div class="session-inline-detail">
                  <div class="attendees-panel">
                    <strong>Presen&ccedil;as</strong>
                    <div class="attendee-grid">
                      ${getEligibleBrothers(session.degree).map((brother) => `<div class="attendee-row"><div><strong>${escapeHtml(brother.name)}</strong><div class="muted">${escapeHtml(getDegreeLabel(brother.degree))}</div></div><button class="presence-toggle ${session.attendance.includes(brother.id) ? "active" : ""}" disabled>${session.attendance.includes(brother.id) ? "Presente" : "Ausente"}</button></div>`).join("") || '<div class="empty-state">Sem irm\u00e3os aptos nesta sess\u00e3o.</div>'}
                    </div>
                  </div>
                  <div class="visitors-panel">
                    <strong>Visitantes</strong>
                    <div class="visitor-grid">
                      ${session.visitors.map((visitor) => `<div class="visitor-row"><div><strong>${escapeHtml(visitor.name)}</strong><div class="muted">${escapeHtml(visitor.lodge || "A.R.L.S.")} \u2022 ${escapeHtml(visitor.city || "-")}</div></div></div>`).join("") || '<div class="empty-state">Nenhum visitante lan\u00e7ado.</div>'}
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  ` : '<div class="empty-state">Nenhuma sess\u00e3o encontrada.</div>';

  qsa("[data-show-session]").forEach((button) => {
    button.onclick = () => {
      const row = qs(`[data-session-detail="${button.dataset.showSession}"]`);
      row?.classList.toggle("hidden");
      button.textContent = row?.classList.contains("hidden") ? "Detalhes" : "Ocultar";
    };
  });
  qsa("[data-edit-session]").forEach((button) => {
    button.onclick = () => {
      buildSessionForm(button.dataset.editSession);
      qs("#sessionFormCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  });
  qsa("[data-delete-session]").forEach((button) => {
    button.onclick = async () => {
      try {
        await api(`/api/sessions/${button.dataset.deleteSession}`, { method: "DELETE" });
        await loadState();
        render();
      } catch (error) {
        showMessage(error.message);
      }
    };
  });
}

function resolveBrotherField(brother, key) {
  const map = {
    name: brother.name,
    treatmentName: brother.treatmentName || "-",
    degree: getDegreeLabel(brother.degree),
    cim: brother.cim,
    cpf: brother.cpf || "-",
    email: brother.email || "-",
    address: brother.address || "-",
    phone: brother.phone || "-",
    wife: brother.wifeName ? `${brother.wifeName}${brother.wifePhone ? ` (${brother.wifePhone})` : ""}` : "-",
    emeritoDate: formatDate(brother.emeritoDate),
    benemeritoDate: formatDate(brother.benemeritoDate)
  };
  return map[key] || "-";
}

function renderReports() {
  qs("#reports").innerHTML = qs("#reportsTemplate").innerHTML;
  buildAttendanceReport();
  buildVisitorsReport();
}

function getInitialReportRange() {
  const allDates = state.sessions
    .map((session) => session.datetime?.slice(0, 10))
    .filter(Boolean)
    .sort();
  const max = allDates[allDates.length - 1] || new Date().toISOString().slice(0, 10);
  const maxDate = new Date(`${max}T00:00:00`);
  const startDate = new Date(maxDate);
  startDate.setMonth(startDate.getMonth() - 3);
  return {
    dateFrom: startDate.toISOString().slice(0, 10),
    dateTo: max
  };
}

function getAttendanceReportFilters() {
  return {
    degree: qs("#reportDegreeFilter")?.value || "",
    dateFrom: qs("#reportDateFrom")?.value || "",
    dateTo: qs("#reportDateTo")?.value || ""
  };
}

function getFilteredAttendanceSessions(filters) {
  return state.sessions.filter((session) => {
    const sessionDate = session.datetime?.slice(0, 10) || "";
    if (filters.degree && session.degree !== filters.degree) return false;
    if (filters.dateFrom && sessionDate < filters.dateFrom) return false;
    if (filters.dateTo && sessionDate > filters.dateTo) return false;
    return true;
  });
}

function buildAttendanceLineChart(sessions) {
  if (!sessions.length) {
    return '<div class="empty-state">Nenhuma sess&atilde;o encontrada no per&iacute;odo selecionado.</div>';
  }

  const chronological = [...sessions].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const values = chronological.map((session) => session.attendance.length);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const width = 820;
  const height = 320;
  const left = 20;
  const right = width - 20;
  const top = 18;
  const bottom = height - 34;
  const usableWidth = right - left;
  const usableHeight = bottom - top;
  const range = Math.max(max - min, 1);

  const points = chronological.map((session, index) => {
    const x = left + (chronological.length === 1 ? usableWidth / 2 : (index / (chronological.length - 1)) * usableWidth);
    const y = bottom - (((session.attendance.length - min) / range) * usableHeight);
    return { x, y, session };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`;
  const labels = points.map((point) => `<text x="${point.x}" y="${height - 8}" text-anchor="middle">${escapeHtml(formatDate(point.session.datetime))}</text>`).join("");
  const markers = points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.5"></circle>`).join("");

  return `
    <div class="report-line-chart">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Presenças por sessão">
        <path class="chart-area" d="${areaPath}"></path>
        <path class="chart-line" d="${linePath}"></path>
        ${markers}
        ${labels}
      </svg>
    </div>
  `;
}

function getBrotherAttendanceRows(sessions) {
  return state.brothers.map((brother) => {
    const possibleSessions = sessions.filter((session) => canAttendSession(brother.degree, session.degree));
    const presentSessions = sessions.filter((session) => session.attendance.includes(brother.id));
    const possible = possibleSessions.length;
    const present = presentSessions.length;
    const percentage = possible ? Math.round((present / possible) * 100) : 0;
    return {
      brother,
      possible,
      present,
      percentage,
      presentSessions
    };
  }).filter((row) => row.possible > 0)
    .sort((a, b) => b.percentage - a.percentage || b.present - a.present || a.brother.name.localeCompare(b.brother.name));
}

function getProgressTone(percentage) {
  if (percentage >= 85) return "good";
  if (percentage >= 50) return "medium";
  return "low";
}

function printAttendanceOverview(filters) {
  const sessions = getFilteredAttendanceSessions(filters);
  const rows = getBrotherAttendanceRows(sessions);
  const printWindow = window.open("", "_blank", "width=960,height=720");
  if (!printWindow) {
    showMessage("N\u00e3o foi poss\u00edvel abrir a janela de impress\u00e3o.");
    return;
  }

  const degreeLabel = filters.degree ? getDegreeLabel(filters.degree) : "Todos graus";
  const periodLabel = `${formatDate(filters.dateFrom)} a ${formatDate(filters.dateTo)}`;
  const logoUrl = new URL("logo-loja.png", window.location.href).toString();
  const rowsHtml = rows.length ? rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.brother.name)}</td>
      <td>${escapeHtml(row.brother.cim)}</td>
      <td>${row.present}</td>
      <td>${row.percentage}%</td>
    </tr>
  `).join("") : '<tr><td colspan="4">Nenhum irm\u00e3o encontrado para os filtros selecionados.</td></tr>';

  printWindow.document.write(`<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <title>Frequ\u00eancia por irm\u00e3o</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        color: #111827;
        margin: 32px;
      }
      .print-header {
        text-align: center;
        margin-bottom: 24px;
      }
      .print-header img {
        width: 100px;
        height: 100px;
        object-fit: contain;
        margin-bottom: 12px;
      }
      .print-header h1 {
        margin: 0;
        font-size: 24px;
      }
      .print-header h2 {
        margin: 10px 0 6px;
        font-size: 20px;
      }
      .print-meta {
        margin: 0;
        color: #4b5563;
        font-size: 14px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 24px;
      }
      th, td {
        border: 1px solid #d1d5db;
        padding: 10px 12px;
        text-align: left;
      }
      th {
        background: #f3f4f6;
      }
      @media print {
        body {
          margin: 20px;
        }
      }
    </style>
  </head>
  <body>
    <div class="print-header">
      <img src="${logoUrl}" alt="Logo da loja">
      <h1>A.'.R.'.G.'.E.'.D.'.P.'.M.'.L.'.S.'. F\u00e9, Esperan\u00e7a e Caridade 100</h1>
      <h2>Frequ\u00eancia por irm\u00e3o</h2>
      <p class="print-meta">Per\u00edodo: ${escapeHtml(periodLabel)} | Grau: ${escapeHtml(degreeLabel)}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>Irm\u00e3o</th>
          <th>CIM</th>
          <th>Frequ\u00eancia</th>
          <th>Porcentagem</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </body>
  </html>`);
  printWindow.document.close();
  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
  };
  const logo = printWindow.document.querySelector("img");
  if (logo) {
    logo.onload = () => setTimeout(triggerPrint, 150);
    logo.onerror = () => triggerPrint();
  } else {
    triggerPrint();
  }
}

function renderAttendanceOverview(filters) {
  const sessions = getFilteredAttendanceSessions(filters);
  const rows = getBrotherAttendanceRows(sessions);
  qs("#reportsContent").innerHTML = `
    <article class="panel-card report-main-card">
      <div class="report-summary-head">
        <strong>Total de sess&otilde;es: ${sessions.length}</strong>
      </div>
      ${buildAttendanceLineChart(sessions)}
      <div class="report-section-block">
        <h3 class="section-title report-section-title">Frequ&ecirc;ncia por irm&atilde;os</h3>
        ${rows.length ? `
          <div class="table-wrap report-table-wrap">
            <table class="attendance-ranking-table">
              <thead>
                <tr>
                  <th>Irm&atilde;o</th>
                  <th>CIM</th>
                  <th>Frequ&ecirc;ncia</th>
                  <th>Porcentagem</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${rows.map((row) => `
                  <tr>
                    <td>${escapeHtml(row.brother.name)}</td>
                    <td>${escapeHtml(row.brother.cim)}</td>
                    <td>${row.present}</td>
                    <td>
                      <div class="attendance-progress-cell">
                        <span>${row.percentage}%</span>
                        <div class="attendance-progress">
                          <div class="attendance-progress-bar ${getProgressTone(row.percentage)}" style="width:${row.percentage}%"></div>
                        </div>
                      </div>
                    </td>
                    <td><button type="button" class="table-action-btn" data-report-detail="${row.brother.id}">Detalhes</button></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : '<div class="empty-state">Nenhum irm&atilde;o possui sess&otilde;es poss&iacute;veis nesse per&iacute;odo.</div>'}
      </div>
    </article>
  `;

  qsa("[data-report-detail]").forEach((button) => {
    button.onclick = () => renderAttendanceBrotherDetail(button.dataset.reportDetail, filters);
  });
}

function buildAttendanceReport() {
  const initial = getInitialReportRange();
  qs("#reportDateFrom").value = initial.dateFrom;
  qs("#reportDateTo").value = initial.dateTo;
  const renderAttendance = () => renderAttendanceOverview(getAttendanceReportFilters());
  qs("#attendanceFilterBtn").onclick = renderAttendance;
  qs("#attendancePrintBtn").onclick = () => printAttendanceOverview(getAttendanceReportFilters());
  qs("#reportDegreeFilter").onchange = renderAttendance;
  qs("#reportDateFrom").onchange = renderAttendance;
  qs("#reportDateTo").onchange = renderAttendance;
  renderAttendance();
}

function renderAttendanceBrotherDetail(brotherId, filters) {
  const brother = state.brothers.find((item) => item.id === brotherId);
  if (!brother) return;

  const sessions = getFilteredAttendanceSessions(filters);
  const presentSessions = sessions
    .filter((session) => session.attendance.includes(brother.id))
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

  const groupedPresence = {
    aprendiz: presentSessions.filter((session) => session.degree === "aprendiz").length,
    companheiro: presentSessions.filter((session) => session.degree === "companheiro").length,
    mestre: presentSessions.filter((session) => session.degree === "mestre").length
  };
  const totalPresent = presentSessions.length || 1;
  const pieItems = [
    { key: "aprendiz", label: "Aprendiz Ma\u00e7om", color: "#a7d489", value: groupedPresence.aprendiz },
    { key: "companheiro", label: "Companheiro Ma\u00e7om", color: "#e06a2e", value: groupedPresence.companheiro },
    { key: "mestre", label: "Mestre Ma\u00e7om", color: "#2c7be5", value: groupedPresence.mestre }
  ].filter((item) => item.value > 0);

  const possible = sessions.filter((session) => canAttendSession(brother.degree, session.degree)).length;
  const pieTotal = pieItems.reduce((sum, item) => sum + item.value, 0);
  const pieStyle = pieTotal ? `background: conic-gradient(${(() => {
    let current = 0;
    return pieItems.map((item) => {
      const next = current + (item.value / pieTotal) * 360;
      const segment = `${item.color} ${current}deg ${next}deg`;
      current = next;
      return segment;
    }).join(", ");
  })()})` : "";

  qs("#reportsContent").innerHTML = `
    <article class="panel-card report-main-card">
      <div class="report-detail-top">
        <div>
          <button type="button" class="btn-secondary report-back-btn" id="backToAttendanceReport">Voltar</button>
          <p class="page-breadcrumb">PAINEL / RELAT&Oacute;RIOS / RELAT&Oacute;RIO DE FREQU&Ecirc;NCIA</p>
          <h3 class="section-title report-detail-title">Frequ&ecirc;ncia do Ir.: ${escapeHtml(brother.name)}</h3>
          <p class="muted">CIM: ${escapeHtml(brother.cim)}</p>
        </div>
        <div class="sessions-toolbar reports-toolbar report-detail-toolbar">
          <input class="toolbar-input" type="date" value="${escapeHtml(filters.dateFrom)}" disabled>
          <input class="toolbar-input" type="date" value="${escapeHtml(filters.dateTo)}" disabled>
          <button type="button" class="btn-secondary toolbar-search-btn" id="printAttendanceReport">Imprimir</button>
        </div>
      </div>

      <div class="report-detail-layout">
        <div>
          <h3 class="section-title report-section-title">Frequ&ecirc;ncia do irm&atilde;o</h3>
          ${presentSessions.length ? `
            <div class="table-wrap report-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>T&iacute;tulo</th>
                    <th>Tipo</th>
                    <th>Grau</th>
                  </tr>
                </thead>
                <tbody>
                  ${presentSessions.map((session) => `
                    <tr>
                      <td>${escapeHtml(formatDate(session.datetime))}</td>
                      <td>${escapeHtml(normalizeBrokenText(session.theme))}</td>
                      <td>Ordin&aacute;ria</td>
                      <td>${escapeHtml(getDegreeLabel(session.degree))} Ma&ccedil;om</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : '<div class="empty-state">Nenhuma presen&ccedil;a encontrada para esse irm&atilde;o no per&iacute;odo.</div>'}
        </div>

        <div>
          <h3 class="section-title report-section-title">Gr&aacute;ficos</h3>
          <div class="report-brother-chart">
            <div class="report-brother-pie" style="${pieStyle}"></div>
            <div class="legend-list">
              ${pieItems.length ? pieItems.map((item) => `<div class="legend-item"><div><span class="legend-swatch" style="background:${item.color}"></span>${item.value} - ${escapeHtml(item.label)}</div></div>`).join("") : '<div class="empty-state">Sem dados para o gr&aacute;fico.</div>'}
            </div>
          </div>
        </div>
      </div>

      <div class="report-section-block">
        <h3 class="section-title report-section-title">Porcentagem de Presen&ccedil;a por Grau</h3>
        <div class="table-wrap report-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Grau</th>
                <th>Total de presen&ccedil;as</th>
                <th>Porcentagem</th>
              </tr>
            </thead>
            <tbody>
              ${[
                ["Aprendiz Ma\u00e7om", groupedPresence.aprendiz],
                ["Companheiro Ma\u00e7om", groupedPresence.companheiro],
                ["Mestre Ma\u00e7om", groupedPresence.mestre]
              ].filter(([, value]) => value > 0).map(([label, value]) => `
                <tr>
                  <td>${label}</td>
                  <td>${value}</td>
                  <td>${possible ? ((value / possible) * 100).toFixed(2) : "0.00"}%</td>
                </tr>
              `).join("") || '<tr><td colspan="3">Sem presen&ccedil;as registradas nesse per&iacute;odo.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  `;

  qs("#backToAttendanceReport").onclick = () => renderAttendanceOverview(filters);
  qs("#printAttendanceReport").onclick = () => window.print();
}

function buildVisitorsReport() {
  qs("#visitorsReportControls").innerHTML = `<div class="report-filters"><input id="visitorCityFilter" placeholder="Filtrar por cidade"><input id="visitorLodgeFilter" placeholder="Filtrar por A.R.L.S."></div>`;
  const renderVisitors = () => {
    const city = qs("#visitorCityFilter").value.trim().toLowerCase();
    const lodge = qs("#visitorLodgeFilter").value.trim().toLowerCase();
    const grouped = {};
    state.sessions.forEach((session) => {
      session.visitors.forEach((visitor) => {
        if (city && !String(visitor.city || "").toLowerCase().includes(city)) return;
        if (lodge && !String(visitor.lodge || "").toLowerCase().includes(lodge)) return;
        const key = `${visitor.name}|${visitor.lodge}|${visitor.city}`;
        grouped[key] = grouped[key] || { ...visitor, visits: 0 };
        grouped[key].visits += 1;
      });
    });
    const rows = Object.values(grouped).sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name));
    qs("#visitorsReportTable").innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Visitante</th><th>A.R.L.S.</th><th>Cidade</th><th>Frequ\u00eancia</th></tr></thead><tbody>${rows.map((visitor) => `<tr><td>${escapeHtml(visitor.name)}</td><td>${escapeHtml(visitor.lodge || "A.R.L.S.")}</td><td>${escapeHtml(visitor.city || "-")}</td><td>${visitor.visits}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty-state">Nenhum visitante encontrado com os filtros selecionados.</div>';
  };
  qs("#visitorCityFilter").oninput = renderVisitors;
  qs("#visitorLodgeFilter").oninput = renderVisitors;
  renderVisitors();
}

function renderBirthdayCalendar(container, monthsToShow) {
  const now = new Date();
  const events = collectBirthdayEvents();
  const months = Array.from({ length: monthsToShow }, (_, index) => new Date(now.getFullYear(), now.getMonth() + index, 1));
  container.innerHTML = `<div class="calendar-grid">${months.map((date) => {
    const monthEvents = events.filter((event) => event.yearReference === date.getFullYear() && event.month === date.getMonth());
    return `<div class="calendar-month"><h4>${escapeHtml(capitalize(monthLabel(date)))}</h4><div class="calendar-days">${monthEvents.length ? monthEvents.map((event) => `<div class="calendar-row"><div><strong>${escapeHtml(event.name)}</strong><div class="muted">${escapeHtml(event.type)}</div></div><strong>${event.day}</strong></div>`).join("") : '<div class="empty-state">Sem anivers\u00e1rios neste m\u00eas.</div>'}</div></div>`;
  }).join("")}</div>`;
}

function renderCalendar() {
  qs("#calendar").innerHTML = qs("#calendarTemplate").innerHTML;
  renderBirthdayCalendar(qs("#calendarContent"), 12);
}

function render() {
  sortSessions();
  renderShell();
  renderDashboard();
  renderBrothers();
  renderSessions();
  renderReports();
  renderCalendar();
}

async function init() {
  try {
    await loadState();
    render();
  } catch (error) {
    document.body.innerHTML = `<div style="padding:32px;font-family:Manrope,sans-serif;"><h1>Erro ao carregar os dados</h1><p>${escapeHtml(error.message)}</p><p>Inicie o servidor local com <strong>node server.js</strong>.</p></div>`;
  }
}

init();
