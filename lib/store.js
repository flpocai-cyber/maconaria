const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const DATA_FILE = path.join(process.cwd(), "data", "store.json");
const STORE_CACHE_TTL_MS = 30 * 1000;
let schemaReady;
let sqlClient;
let storeCache = null;

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function getSql() {
  if (!sqlClient) {
    const postgres = require("postgres");
    sqlClient = postgres(process.env.DATABASE_URL, {
      ssl: "require",
      max: 1,
      prepare: false
    });
  }
  return sqlClient;
}

function cloneStore(store) {
  return {
    brothers: (store.brothers || []).map((brother) => ({ ...brother })),
    sessions: (store.sessions || []).map((session) => ({
      ...session,
      attendance: [...(session.attendance || [])],
      visitors: (session.visitors || []).map((visitor) => ({ ...visitor }))
    }))
  };
}

function getCachedStore() {
  if (!storeCache || storeCache.expiresAt < Date.now()) return null;
  return cloneStore(storeCache.value);
}

function setCachedStore(store) {
  storeCache = {
    value: cloneStore(store),
    expiresAt: Date.now() + STORE_CACHE_TTL_MS
  };
  return store;
}

function invalidateStoreCache() {
  storeCache = null;
}

async function ensureSchema() {
  if (!hasDatabase()) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`
        create table if not exists brothers (
          id text primary key,
          name text not null,
          address text not null default '',
          phone text not null default '',
          birth_date text not null default '',
          cim text not null,
          degree text not null,
          initiation_date text not null default '',
          elevation_date text not null default '',
          exaltation_date text not null default '',
          emerito_date text not null default '',
          benemerito_date text not null default '',
          wife_name text not null default '',
          wife_birth_date text not null default '',
          wife_phone text not null default ''
        );
      `;
      await sql`alter table brothers add column if not exists treatment_name text not null default ''`;
      await sql`alter table brothers add column if not exists cpf text not null default ''`;
      await sql`alter table brothers add column if not exists email text not null default ''`;
      await sql`
        create table if not exists sessions (
          id text primary key,
          datetime text not null,
          theme text not null,
          notes text not null default '',
          degree text not null
        );
      `;
      await sql`
        create table if not exists session_attendance (
          session_id text not null references sessions(id) on delete cascade,
          brother_id text not null references brothers(id) on delete cascade,
          primary key (session_id, brother_id)
        );
      `;
      await sql`
        create table if not exists session_visitors (
          id text primary key,
          session_id text not null references sessions(id) on delete cascade,
          name text not null,
          lodge text not null default 'A.R.L.S.',
          city text not null default ''
        );
      `;
    })();
  }
  await schemaReady;
}

async function readFileStore() {
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const data = JSON.parse(raw);
  return {
    brothers: Array.isArray(data.brothers) ? data.brothers : [],
    sessions: Array.isArray(data.sessions) ? data.sessions : []
  };
}

async function writeFileStore(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function normalizeBrother(input) {
  return {
    id: input.id || randomUUID(),
    name: String(input.name || "").trim(),
    treatmentName: String(input.treatmentName || "").trim(),
    address: String(input.address || "").trim(),
    phone: String(input.phone || "").trim(),
    birthDate: String(input.birthDate || ""),
    cim: String(input.cim || "").trim(),
    cpf: String(input.cpf || "").trim(),
    email: String(input.email || "").trim(),
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

function canAttendSession(brotherDegree, sessionDegree) {
  const order = { aprendiz: 1, companheiro: 2, mestre: 3 };
  return order[brotherDegree] >= order[sessionDegree];
}

function sanitizeSessionAttendance(session, brothers) {
  const eligibleIds = new Set(
    brothers
      .filter((brother) => canAttendSession(brother.degree, session.degree))
      .map((brother) => brother.id)
  );

  session.attendance = [...new Set(session.attendance)].filter((brotherId) => eligibleIds.has(brotherId));
  return session;
}

function validateBrother(input) {
  if (!input.name || !input.cim || !input.degree) return "Nome, CIM e grau são obrigatórios.";
  return null;
}

function validateSession(input) {
  if (!input.datetime || !input.theme || !input.degree) return "Data/hora, tema e grau são obrigatórios.";
  return null;
}

async function loadStore() {
  const cached = getCachedStore();
  if (cached) return cached;

  if (!hasDatabase()) {
    const store = await readFileStore();
    store.sessions.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    return setCachedStore(store);
  }

  await ensureSchema();
  const sql = getSql();
  const [brothers, sessions, attendance, visitors] = await Promise.all([
    sql`select * from brothers order by name asc`,
    sql`select * from sessions order by datetime desc`,
    sql`select session_id, brother_id from session_attendance`,
    sql`select * from session_visitors order by name asc`
  ]);

  const attendanceMap = new Map();
  for (const row of attendance) {
    if (!attendanceMap.has(row.session_id)) attendanceMap.set(row.session_id, []);
    attendanceMap.get(row.session_id).push(row.brother_id);
  }

  const visitorsMap = new Map();
  for (const row of visitors) {
    if (!visitorsMap.has(row.session_id)) visitorsMap.set(row.session_id, []);
    visitorsMap.get(row.session_id).push({ id: row.id, name: row.name, lodge: row.lodge, city: row.city });
  }

  return setCachedStore({
    brothers: brothers.map((row) => ({
      id: row.id,
      name: row.name,
      treatmentName: row.treatment_name || "",
      address: row.address,
      phone: row.phone,
      birthDate: row.birth_date,
      cim: row.cim,
      cpf: row.cpf || "",
      email: row.email || "",
      degree: row.degree,
      initiationDate: row.initiation_date,
      elevationDate: row.elevation_date,
      exaltationDate: row.exaltation_date,
      emeritoDate: row.emerito_date,
      benemeritoDate: row.benemerito_date,
      wifeName: row.wife_name,
      wifeBirthDate: row.wife_birth_date,
      wifePhone: row.wife_phone
    })),
    sessions: sessions.map((row) => ({
      id: row.id,
      datetime: row.datetime,
      theme: row.theme,
      notes: row.notes,
      degree: row.degree,
      attendance: attendanceMap.get(row.id) || [],
      visitors: visitorsMap.get(row.id) || []
    }))
  });
}

async function createBrother(input) {
  const brother = normalizeBrother(input);
  const error = validateBrother(brother);
  if (error) throw new Error(error);

  if (!hasDatabase()) {
    const store = await readFileStore();
    store.brothers.unshift(brother);
    await writeFileStore(store);
    invalidateStoreCache();
    return brother;
  }

  await ensureSchema();
  const sql = getSql();
  await sql`
    insert into brothers (
      id, name, treatment_name, address, phone, birth_date, cim, cpf, email, degree,
      initiation_date, elevation_date, exaltation_date,
      emerito_date, benemerito_date, wife_name, wife_birth_date, wife_phone
    ) values (
      ${brother.id}, ${brother.name}, ${brother.treatmentName}, ${brother.address}, ${brother.phone}, ${brother.birthDate}, ${brother.cim}, ${brother.cpf}, ${brother.email}, ${brother.degree},
      ${brother.initiationDate}, ${brother.elevationDate}, ${brother.exaltationDate},
      ${brother.emeritoDate}, ${brother.benemeritoDate}, ${brother.wifeName}, ${brother.wifeBirthDate}, ${brother.wifePhone}
    )
  `;
  invalidateStoreCache();
  return brother;
}

async function updateBrother(id, input) {
  const brother = normalizeBrother({ ...input, id });
  const error = validateBrother(brother);
  if (error) throw new Error(error);

  if (!hasDatabase()) {
    const store = await readFileStore();
    store.brothers = store.brothers.map((item) => item.id === id ? brother : item);
    await writeFileStore(store);
    invalidateStoreCache();
    return brother;
  }

  await ensureSchema();
  const sql = getSql();
  await sql`
    update brothers set
      name = ${brother.name},
      treatment_name = ${brother.treatmentName},
      address = ${brother.address},
      phone = ${brother.phone},
      birth_date = ${brother.birthDate},
      cim = ${brother.cim},
      cpf = ${brother.cpf},
      email = ${brother.email},
      degree = ${brother.degree},
      initiation_date = ${brother.initiationDate},
      elevation_date = ${brother.elevationDate},
      exaltation_date = ${brother.exaltationDate},
      emerito_date = ${brother.emeritoDate},
      benemerito_date = ${brother.benemeritoDate},
      wife_name = ${brother.wifeName},
      wife_birth_date = ${brother.wifeBirthDate},
      wife_phone = ${brother.wifePhone}
    where id = ${id}
  `;
  invalidateStoreCache();
  return brother;
}

async function deleteBrother(id) {
  if (!hasDatabase()) {
    const store = await readFileStore();
    store.brothers = store.brothers.filter((brother) => brother.id !== id);
    store.sessions = store.sessions.map((session) => ({ ...session, attendance: session.attendance.filter((brotherId) => brotherId !== id) }));
    await writeFileStore(store);
    invalidateStoreCache();
    return;
  }

  await ensureSchema();
  const sql = getSql();
  await sql`delete from brothers where id = ${id}`;
  invalidateStoreCache();
}

async function replaceSessionData(sql, session) {
  await sql`delete from session_attendance where session_id = ${session.id}`;
  await sql`delete from session_visitors where session_id = ${session.id}`;

  for (const brotherId of session.attendance) {
    await sql`insert into session_attendance (session_id, brother_id) values (${session.id}, ${brotherId}) on conflict do nothing`;
  }

  for (const visitor of session.visitors) {
    await sql`
      insert into session_visitors (id, session_id, name, lodge, city)
      values (${visitor.id}, ${session.id}, ${visitor.name}, ${visitor.lodge}, ${visitor.city})
    `;
  }
}

async function createSession(input) {
  const session = normalizeSession(input);
  const error = validateSession(session);
  if (error) throw new Error(error);

  if (!hasDatabase()) {
    const store = await readFileStore();
    sanitizeSessionAttendance(session, store.brothers);
    store.sessions.unshift(session);
    store.sessions.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    await writeFileStore(store);
    invalidateStoreCache();
    return session;
  }

  await ensureSchema();
  const sql = getSql();
  const brothers = await sql`select id, degree from brothers`;
  sanitizeSessionAttendance(session, brothers);
  await sql.begin(async (trx) => {
    await trx`insert into sessions (id, datetime, theme, notes, degree) values (${session.id}, ${session.datetime}, ${session.theme}, ${session.notes}, ${session.degree})`;
    await replaceSessionData(trx, session);
  });
  invalidateStoreCache();
  return session;
}

async function updateSession(id, input) {
  const session = normalizeSession({ ...input, id });
  const error = validateSession(session);
  if (error) throw new Error(error);

  if (!hasDatabase()) {
    const store = await readFileStore();
    sanitizeSessionAttendance(session, store.brothers);
    store.sessions = store.sessions.map((item) => item.id === id ? session : item);
    store.sessions.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    await writeFileStore(store);
    invalidateStoreCache();
    return session;
  }

  await ensureSchema();
  const sql = getSql();
  const brothers = await sql`select id, degree from brothers`;
  sanitizeSessionAttendance(session, brothers);
  await sql.begin(async (trx) => {
    await trx`update sessions set datetime = ${session.datetime}, theme = ${session.theme}, notes = ${session.notes}, degree = ${session.degree} where id = ${id}`;
    await replaceSessionData(trx, session);
  });
  invalidateStoreCache();
  return session;
}

async function deleteSession(id) {
  if (!hasDatabase()) {
    const store = await readFileStore();
    store.sessions = store.sessions.filter((session) => session.id !== id);
    await writeFileStore(store);
    invalidateStoreCache();
    return;
  }

  await ensureSchema();
  const sql = getSql();
  await sql`delete from sessions where id = ${id}`;
  invalidateStoreCache();
}

module.exports = {
  loadStore,
  createBrother,
  updateBrother,
  deleteBrother,
  createSession,
  updateSession,
  deleteSession
};
