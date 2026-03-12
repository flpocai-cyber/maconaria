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
  { key: "degree", label: "Grau" },
  { key: "cim", label: "CIM" },
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
  qsa(".nav-link").forEach((button) => {
    button.onclick = () => {
      qsa(".nav-link").forEach((item) => {
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
  qs("#brotherSearch").addEventListener("input", (event) => buildBrothersTable(event.target.value));
}

function buildBrotherForm(editId = "") {
  const brother = state.brothers.find((item) => item.id === editId) || {};
  qs("#brotherForm").innerHTML = `
    ${textField("name", "Nome", brother.name, true)}
    ${textField("cim", "CIM", brother.cim, true)}
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
      address: formData.address.trim(),
      phone: formData.phone.trim(),
      birthDate: formData.birthDate,
      cim: formData.cim.trim(),
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
  const brothers = state.brothers.filter((brother) => [brother.name, brother.cim, getDegreeLabel(brother.degree)].some((value) => String(value).toLowerCase().includes(term)));
  qs("#brothersTable").innerHTML = brothers.length ? `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nome</th><th>Grau</th><th>CIM</th><th>Esposa</th><th>A\u00e7\u00f5es</th></tr></thead>
        <tbody>
          ${brothers.map((brother) => `
            <tr>
              <td><strong>${escapeHtml(brother.name)}</strong><div class="muted">${escapeHtml(brother.phone || "-")}</div></td>
              <td><span class="badge ${brother.degree}">${escapeHtml(getDegreeLabel(brother.degree))}</span></td>
              <td>${escapeHtml(brother.cim)}</td>
              <td>${escapeHtml(brother.wifeName || "-")}</td>
              <td><button class="btn-secondary" data-edit-brother="${brother.id}">Editar</button> <button class="btn-secondary" data-delete-brother="${brother.id}">Excluir</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  ` : '<div class="empty-state">Nenhum irm\u00e3o encontrado.</div>';

  qsa("[data-edit-brother]").forEach((button) => { button.onclick = () => buildBrotherForm(button.dataset.editBrother); });
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

  qs("#sessionForm").innerHTML = `
    ${datetimeField("datetime", "Data e hora", session.datetime, true)}
    ${selectField("degree", "Grau da sess\u00e3o", SESSION_LEVELS, session.degree, true)}
    ${textField("theme", "Tema", session.theme, true)}
    ${textareaField("notes", "Observa\u00e7\u00f5es", session.notes, "field-wide")}
    <div class="field-wide"><label>Irm\u00e3os aptos para presen\u00e7a</label><div class="attendees-panel"><div class="attendee-grid">${eligible.length ? eligible.map((brother) => `<div class="attendee-row"><div><strong>${escapeHtml(brother.name)}</strong><div class="muted">${escapeHtml(getDegreeLabel(brother.degree))} \u2022 CIM ${escapeHtml(brother.cim)}</div></div><label><input type="checkbox" name="attendance" value="${brother.id}" ${session.attendance.includes(brother.id) ? "checked" : ""}> Presente</label></div>`).join("") : '<div class="empty-state">Nenhum irm\u00e3o apto para este grau.</div>'}</div></div></div>
    <div class="field-wide"><label>Visitantes</label><div class="visitors-panel"><div id="visitorsEditor"></div><div class="visitor-form-inline"><input id="visitorName" placeholder="Nome do visitante"><input id="visitorLodge" placeholder="A.R.L.S."><input id="visitorCity" placeholder="Cidade"><button type="button" class="btn-secondary" id="addVisitorBtn">Adicionar visitante</button></div></div></div>
    <input type="hidden" name="id" value="${escapeHtml(editId)}">
    <div class="form-actions"><button type="submit" class="btn">${editId ? "Salvar sess\u00e3o" : "Cadastrar sess\u00e3o"}</button><button type="button" class="btn-secondary" id="resetSessionForm">Limpar</button></div>
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
                <div class="sessions-title-main">${escapeHtml(session.theme)}</div>
                <div class="sessions-title-sub">${escapeHtml(session.notes || "Sem observa\u00e7\u00f5es.")}</div>
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
    degree: getDegreeLabel(brother.degree),
    cim: brother.cim,
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
  buildBrothersReport();
  buildAttendanceReport();
  buildVisitorsReport();
}

function buildBrothersReport() {
  qs("#brothersReportControls").innerHTML = `<div class="checkbox-list">${REPORT_FIELDS.map((field) => `<label><input type="checkbox" value="${field.key}" ${["name", "degree", "cim"].includes(field.key) ? "checked" : ""}> ${field.label}</label>`).join("")}</div>`;
  const renderTable = () => {
    const selected = qsa("input:checked", qs("#brothersReportControls")).map((input) => input.value);
    const headers = REPORT_FIELDS.filter((field) => selected.includes(field.key));
    qs("#brothersReportTable").innerHTML = headers.length ? `<div class="table-wrap"><table><thead><tr>${headers.map((field) => `<th>${field.label}</th>`).join("")}</tr></thead><tbody>${state.brothers.map((brother) => `<tr>${headers.map((field) => `<td>${escapeHtml(resolveBrotherField(brother, field.key))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : '<div class="empty-state">Selecione pelo menos um campo.</div>';
  };
  qsa("input", qs("#brothersReportControls")).forEach((input) => { input.onchange = renderTable; });
  renderTable();
}

function buildAttendanceReport() {
  qs("#attendanceReportControls").innerHTML = `<div class="report-filters"><select id="attendanceRange"><option value="1">\u00daltimo m\u00eas</option><option value="2">\u00daltimos 2 meses</option><option value="3" selected>\u00daltimos 3 meses</option><option value="6">\u00daltimos 6 meses</option><option value="12">\u00daltimos 12 meses</option></select></div>`;
  const renderAttendance = () => {
    const sessions = getPeriodSessions(Number(qs("#attendanceRange").value));
    const totals = { aprendiz: 0, companheiro: 0, mestre: 0, faltas: 0 };
    sessions.forEach((session) => {
      totals[session.degree] += 1;
      getEligibleBrothers(session.degree).forEach((brother) => {
        if (!session.attendance.includes(brother.id)) totals.faltas += 1;
      });
    });
    renderPieChart(qs("#attendancePie"), qs("#attendanceLegend"), [
      { label: "Sess\u00f5es de Aprendiz", value: totals.aprendiz, color: PIE_COLORS.aprendiz },
      { label: "Sess\u00f5es de Companheiro", value: totals.companheiro, color: PIE_COLORS.companheiro },
      { label: "Sess\u00f5es de Mestre", value: totals.mestre, color: PIE_COLORS.mestre },
      { label: "Faltas", value: totals.faltas, color: PIE_COLORS.faltas }
    ]);
    qs("#attendanceReportTable").innerHTML = state.brothers.length ? `<div class="table-wrap"><table><thead><tr><th>Irm\u00e3o</th><th>CIM</th><th>Grau</th><th>Presen\u00e7as</th><th>Sess\u00f5es poss\u00edveis</th><th>Percentual</th></tr></thead><tbody>${state.brothers.map((brother) => {
      const possible = sessions.filter((session) => canAttendSession(brother.degree, session.degree)).length;
      const present = sessions.filter((session) => session.attendance.includes(brother.id)).length;
      const rate = possible ? Math.round((present / possible) * 100) : 0;
      return `<tr><td>${escapeHtml(brother.name)}</td><td>${escapeHtml(brother.cim)}</td><td>${escapeHtml(getDegreeLabel(brother.degree))}</td><td>${present}</td><td>${possible}</td><td>${rate}%</td></tr>`;
    }).join("")}</tbody></table></div>` : '<div class="empty-state">Cadastre irm\u00e3os e sess\u00f5es para visualizar o relat\u00f3rio.</div>';
  };
  qs("#attendanceRange").onchange = renderAttendance;
  renderAttendance();
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
