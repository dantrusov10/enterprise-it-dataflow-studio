/**
 * Конфигуратор: два режима (зоны паутины / свободный текст) + эвристика вендоров.
 * Зависит от window.ENTERPRISE_KB (enterprise-it-dataflow-knowledge.js).
 */
(function () {
  const KB = window.ENTERPRISE_KB || { zones: {}, classReference: {}, classSheets: {} };

  const MAP = {
    zones: [
      { id: "z-src", title: "Источники первичных данных" },
      { id: "z-disc", title: "Discovery / Inventory слой" },
      { id: "z-cld", title: "Cloud / Hybrid" },
      { id: "z-cmdb", title: "CMDB · Golden Record (SoT)" },
      { id: "z-norm", title: "Нормализация / идентификация / обогащение" },
      { id: "z-itsm", title: "ITSM / Service Management" },
      { id: "z-fin", title: "ITAM / SAM / Finance" },
      { id: "z-sec", title: "Security / Risk / Compliance" },
      { id: "z-ops", title: "Monitoring / Operations" },
      { id: "z-bi", title: "BI / Governance" }
    ],
    nodes: [
      { id: "n-hub", label: "CMDB / Asset Data Hub\nGolden Record", zoneId: "z-cmdb", hub: true },
      { id: "n-src1", label: "Endpoints / Servers", zoneId: "z-src" },
      { id: "n-src2", label: "HRM / HRIS", zoneId: "z-src" },
      { id: "n-src3", label: "ERP / Procurement", zoneId: "z-src" },
      { id: "n-src4", label: "IAM / IGA / PAM", zoneId: "z-src" },
      { id: "n-d1", label: "Discovery / Inventory", zoneId: "z-disc" },
      { id: "n-d3", label: "Cloud Inventory", zoneId: "z-disc" },
      { id: "n-d4", label: "UEM / MDM", zoneId: "z-disc" },
      { id: "n-d5", label: "NAC", zoneId: "z-disc" },
      { id: "n-d6", label: "IPAM / DNS / DHCP", zoneId: "z-disc" },
      { id: "n-d7", label: "Network Mgmt / NMS", zoneId: "z-disc" },
      { id: "n-n1", label: "Normalization Engine", zoneId: "z-norm" },
      { id: "n-n2", label: "Reconciliation / De-dup", zoneId: "z-norm" },
      { id: "n-n3", label: "Software Recognition", zoneId: "z-norm" },
      { id: "n-n4", label: "Ownership Enrichment", zoneId: "z-norm" },
      { id: "n-t1", label: "ITSM Core", zoneId: "z-itsm" },
      { id: "n-t2", label: "Service Desk", zoneId: "z-itsm" },
      { id: "n-t3", label: "Incident Mgmt", zoneId: "z-itsm" },
      { id: "n-t4", label: "Change Mgmt", zoneId: "z-itsm" },
      { id: "n-t5", label: "Problem Mgmt", zoneId: "z-itsm" },
      { id: "n-t6", label: "Service Catalog", zoneId: "z-itsm" },
      { id: "n-t7", label: "Knowledge Base", zoneId: "z-itsm" },
      { id: "n-t8", label: "Release Mgmt", zoneId: "z-itsm" },
      { id: "n-t9", label: "BPM / Workflow", zoneId: "z-itsm" },
      { id: "n-f1", label: "ITAM", zoneId: "z-fin" },
      { id: "n-f2", label: "SAM", zoneId: "z-fin" },
      { id: "n-f3", label: "FinOps", zoneId: "z-fin" },
      { id: "n-f4", label: "License Mgmt", zoneId: "z-fin" },
      { id: "n-f5", label: "Asset Lifecycle", zoneId: "z-fin" },
      { id: "n-f6", label: "ERP Sync", zoneId: "z-fin" },
      { id: "n-s1", label: "SIEM", zoneId: "z-sec" },
      { id: "n-s2", label: "Vulnerability Mgmt", zoneId: "z-sec" },
      { id: "n-s6", label: "PAM", zoneId: "z-sec" },
      { id: "n-s3", label: "EDR", zoneId: "z-sec" },
      { id: "n-s4", label: "DLP", zoneId: "z-sec" },
      { id: "n-s5", label: "GRC", zoneId: "z-sec" },
      { id: "n-o1", label: "Monitoring / Event", zoneId: "z-ops" },
      { id: "n-o2", label: "APM / Observability", zoneId: "z-ops" },
      { id: "n-o3", label: "Deployment / SW Dist", zoneId: "z-ops" },
      { id: "n-o4", label: "Patch Management", zoneId: "z-ops" },
      { id: "n-o5", label: "Configuration Mgmt", zoneId: "z-ops" },
      { id: "n-c1", label: "CMP", zoneId: "z-cld" },
      { id: "n-c2", label: "Cloud Governance", zoneId: "z-cld" },
      { id: "n-b1", label: "BI / DWH", zoneId: "z-bi" },
      { id: "n-b2", label: "Executive Dashboards", zoneId: "z-bi" }
    ]
  };

  const NODE_KB_CLASSREF_KEY = {
    "n-t2": "Service Desk",
    "n-t3": "Incident Management",
    "n-t4": "Change Management",
    "n-t5": "Problem Management",
    "n-t8": "Release Management",
    "n-f1": "ITAM",
    "n-f2": "SAM",
    "n-f4": "License Management",
    "n-s2": "Vulnerability Management",
    "n-o1": "Monitoring / Event",
    "n-o5": "Configuration Management"
  };

  const NODE_KB_SHEET_KEY = {
    "n-o1": "мониторинг",
    "n-s2": "Сканер уязвимости"
  };

  const KB_SHEET_PROMISES = Object.create(null);

  /** Последний успешный подбор: для слоя вендоров и композиции. */
  let lastRunCtx = null;
  /** Ключи выбранных продуктов каталога (vendor\u0001product) для матрицы тем. */
  let CATALOG_PICK_KEYS = new Set();
  /** Фильтр строк матрицы: все функции топа или только отмеченные в корреляции. */
  let CFG_MX_FILTER = "all";
  /** Выбор функций KB по тезисам: индекс тезиса → набор ключей строк функций. */
  const corrState = { thesisPicks: new Map() };
  /** Свободный режим: второй клик «Подобрать бандл» строит таблицу бандла после корреляции. */
  let FREE_BUNDLE_STEP2 = false;

  /** Общий ключ с index.html. Только localStorage: новая вкладка не видит sessionStorage родителя. */
  const PROJECT_MAP_STORAGE_KEY = "enterprise_it_project_map_v1";

  const RU_STEM_SUFFIXES = [
    "иями","ями","остями","ях","ах","ами","ого","ему","ому","ыми","ех","ох","им","ым","ую","юю","ых","их","ая","ое","ые","ий","ой","ей","ем","ам","ям","ию","ия","ие","ов","ев","ть","ся","сь","ла","ли","ло","на","но","ны","ет","ют","ат","ят","ить","ать","ение","ения","ости","ания","ован","ирован","ельн","ество","нн","лись"
  ];

  const THESAURUS_GROUPS = [
    ["инцидент","инциденты","incident","outage","авария","сбой","простой","тикет","ticket","обращение","дежурство","major","p1","эскалац"],
    ["лиценз","license","licence","sam","entitlement","елп","elp","true-up","trueup","комплаенс лиценз"],
    ["дискавери","discovery","инвентаризац","inventory","сканир","обнаружен","снмп","snmp","агент","wmi","ssh"],
    ["безопасн","security","siem","edr","угроз","vulnerab","уязвим","grc","кибер","soc","pam","dlp","форензик"],
    ["изменен","change","релиз","release","деплой","deployment","патч","patch","конфигур","drift","rollout"],
    ["актив","asset","itam","cmdb","ci","golden","золот","оборудован","hw","издел"],
    ["доступ","access","iam","iga","идентич","роль","провижин","provision","joiner","mover","leaver","sso"],
    ["монитор","monitor","наблюдаем","observability","алерт","метрик","apm","лог","trace","telemet"],
    ["финанс","finops","стоимост","tco","roi","бюджет","chargeback","закуп","erp","капекс","списан"],
    ["облак","cloud","kubernetes","k8s","контейнер","vpc","s3","bucket","мультиоблак"],
    ["itsm","сервис деск","service desk","заявк","каталог услуг","service catalog","sla"],
    ["нормализ","dedup","дедуп","сопостав","reconcil","сигнатур","recognition","дедуплик"],
    ["данн","data","dataset","отчет","отчёт","dashboard","kpi","аналит"],
    ["событ","event","syslog","коррел","correlat","операц","sre"]
  ];

  const THEME_GROUP_LABELS = [
    "Инциденты / ITSM / обращения",
    "Лицензии / SAM / entitlement",
    "Discovery / инвентаризация",
    "Безопасность / риски / SOC",
    "Изменения / релизы / патчи",
    "CMDB / ITAM / активы",
    "IAM / доступы / PAM",
    "Мониторинг / APM / логи",
    "FinOps / стоимость / закупки",
    "Облако / K8s / VPC",
    "Сервис-деск / каталог / SLA",
    "Нормализация / reconciliation",
    "Данные / отчёты / KPI",
    "События / корреляция / SRE"
  ];

  function nrm(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function prepSearch(s) {
    return nrm(String(s || "").replace(/ё/g, "е"));
  }

  function stemToken(tok) {
    let w = prepSearch(tok).replace(/[^a-z0-9а-яіїєґ]+/gi, "");
    if (w.length < 4) return w;
    for (const suf of RU_STEM_SUFFIXES) {
      if (w.length > suf.length + 3 && w.endsWith(suf)) return w.slice(0, -suf.length);
    }
    if (w.length > 5 && /(и|ы|а|я|о|е|й|ь|ю)$/.test(w)) w = w.slice(0, -1);
    return w;
  }

  function tokenizeQuery(q) {
    return prepSearch(q).split(/[^a-z0-9а-яіїєґ]+/i).filter((t) => t.length >= 2);
  }

  function expandQueryTokens(rawTokens) {
    const set = new Set();
    for (const raw of rawTokens) {
      const p = prepSearch(raw);
      if (!p) continue;
      set.add(p);
      set.add(stemToken(p));
      if (/[a-z]/.test(p)) {
        const e = p.replace(/(ing|ed|es|s)$/i, "");
        if (e.length > 2) set.add(e);
      }
      for (const g of THESAURUS_GROUPS) {
        const hit = g.some((x) => {
          const nx = prepSearch(x);
          if (!nx || nx.length < 2) return false;
          return p.includes(nx) || nx.includes(p) || stemToken(p) === stemToken(nx) ||
            stemToken(p).includes(stemToken(nx)) || stemToken(nx).includes(stemToken(p));
        });
        if (hit) g.forEach((x) => { const nx = prepSearch(x); if (nx) { set.add(nx); set.add(stemToken(nx)); } });
      }
    }
    return [...set].filter((t) => t && t.length >= 2);
  }

  function normalizeForMatch(s) {
    return prepSearch(s).replace(/\s+/g, " ");
  }

  function listFromValue(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    return [v];
  }

  function zoneKbById(zoneId) {
    if (!zoneId) return null;
    return KB.zones?.[zoneId] || null;
  }

  function zoneById(id) {
    return MAP.zones.find((z) => z.id === id);
  }

  function nodeById(id) {
    return MAP.nodes.find((n) => n.id === id);
  }

  function expandNodeLabelMatchCandidates(node) {
    if (!node) return [];
    const raw = String(node.label || "").replace(/\n/g, " ").trim();
    const parts = [raw, ...raw.split("/").map((s) => s.trim())].filter(Boolean);
    const out = new Set();
    for (const p of parts) {
      out.add(p);
      out.add(p.replace(/\bMgmt\b/gi, "Management"));
      out.add(p.replace(/\//g, "?"));
    }
    if (node.id === "n-s2") {
      out.add("Сканер уязвимости");
      out.add("Vulnerability Management");
    }
    if (node.id === "n-o1") {
      out.add("мониторинг");
    }
    return [...out].filter(Boolean);
  }

  function classRefByNode(node) {
    if (!node) return null;
    if (node.hub && node.id === "n-hub") {
      const ref = KB.classReference?.["CMDB / Asset Data Hub"];
      if (ref) return { key: "CMDB / Golden Record", data: ref };
    }
    if (node.id === "n-d1") {
      const z = zoneKbById("z-disc");
      if (z) {
        return {
          key: "Discovery / Inventory",
          data: { what: z.what, techGoal: z.techGoal, businessGoal: z.businessGoal, howWorks: z.howWorks }
        };
      }
    }
    const ref = KB.classReference || {};
    const forced = NODE_KB_CLASSREF_KEY[node.id];
    if (forced && ref[forced]) return { key: forced, data: ref[forced] };
    const candidates = expandNodeLabelMatchCandidates(node);
    for (const key of Object.keys(ref)) {
      const nk = nrm(key);
      for (const c of candidates) {
        const nc = nrm(c);
        if (!nc) continue;
        if (nk === nc || nk.includes(nc) || nc.includes(nk)) return { key, data: ref[key] };
      }
    }
    return null;
  }

  function classSheetByNode(node) {
    if (!node) return null;
    const sheets = KB.classSheets || {};
    const flat = nrm(node.label.replace(/\n/g, " "));
    const isDiscoveryInventoryLayer =
      node.id === "n-d1" ||
      (flat.includes("discovery") && flat.includes("inventory") && !flat.includes("cloud"));
    if (isDiscoveryInventoryLayer && sheets["дискаверинг"]) {
      return { key: "дискаверинг", data: sheets["дискаверинг"] };
    }
    const skForced = NODE_KB_SHEET_KEY[node.id];
    if (skForced && sheets[skForced]) return { key: skForced, data: sheets[skForced] };
    const skFromRef = NODE_KB_CLASSREF_KEY[node.id];
    if (skFromRef && sheets[skFromRef]) return { key: skFromRef, data: sheets[skFromRef] };
    const candidates = expandNodeLabelMatchCandidates(node);
    for (const key of Object.keys(sheets)) {
      const nk = nrm(key);
      for (const c of candidates) {
        const nc = nrm(c);
        if (nk === nc || nk.includes(nc) || nc.includes(nk)) return { key, data: sheets[key] };
      }
    }
    return null;
  }

  function sheetHasAllFunctions(meta) {
    return Array.isArray(meta?.allFunctions) && meta.allFunctions.length > 0;
  }

  async function ensureLazySheet(sheetKey) {
    const meta = KB.classSheets?.[sheetKey];
    if (!meta) return null;
    if (sheetHasAllFunctions(meta)) return meta;
    if (!meta.lazySheet) return meta;
    if (KB_SHEET_PROMISES[sheetKey]) {
      await KB_SHEET_PROMISES[sheetKey];
      return meta;
    }
    KB_SHEET_PROMISES[sheetKey] = fetch(`kb/sheets/${meta.lazySheet}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.allFunctions)) {
          meta.allFunctions = data.allFunctions;
          meta.topFunctions = data.topFunctions;
          meta.functionCount = data.functionCount;
        }
      })
      .catch((err) => {
        console.warn("kb/sheets fetch failed", sheetKey, err);
      })
      .finally(() => {
        delete KB_SHEET_PROMISES[sheetKey];
      });
    await KB_SHEET_PROMISES[sheetKey];
    return meta;
  }

  async function ensureLazyForNode(node) {
    if (!node) return;
    const sh = classSheetByNode(node);
    if (sh?.key) await ensureLazySheet(sh.key);
  }

  function scoreSearchItem(item, tokens) {
    const hay = normalizeForMatch(`${item.title} ${item.body}`);
    const ht = normalizeForMatch(item.title);
    const hayWords = hay.split(" ").filter(Boolean);
    let score = 0;
    for (const t of tokens) {
      if (!t || t.length < 2) continue;
      if (hay.includes(t)) score += ht.includes(t) ? 7 : 3;
      const st = stemToken(t);
      if (st.length >= 3 && hay.includes(st)) score += 2;
    }
    for (const t of tokens) {
      const st = stemToken(t);
      if (st.length < 3) continue;
      for (const w of hayWords) {
        if (stemToken(w) === st) { score += 2; break; }
      }
    }
    return score;
  }

  function buildZoneSearchItem(zoneId) {
    const m = zoneById(zoneId);
    const kb = zoneKbById(zoneId) || {};
    const title = m?.title || zoneId;
    const body = `${kb.what || ""} ${kb.techGoal || ""} ${kb.businessGoal || ""} ${kb.howWorks || ""}`;
    return { title, body };
  }

  function buildNodeSearchItem(node) {
    const ref = classRefByNode(node)?.data || {};
    const sheet = classSheetByNode(node)?.data || {};
    const funcList = listFromValue(sheet.allFunctions?.length ? sheet.allFunctions : sheet.topFunctions);
    const functionsText = funcList
      .map((f) => `${f.title || ""} ${f.general || ""} ${f.technical || ""} ${f.business || ""}`)
      .join(" ");
    const title = node.label.replace(/\n/g, " ");
    const body = `${ref.what || ""} ${ref.techGoal || ""} ${ref.businessGoal || ""} ${ref.howWorks || ""} ${functionsText}`;
    return { title, body };
  }

  /** Быстрый скоринг узла без подгрузки lazy‑листов (ускоряет подбор в разы). */
  function buildNodeSearchItemShallow(node) {
    const ref = classRefByNode(node)?.data || {};
    const sheet = classSheetByNode(node)?.data || {};
    const funcList = listFromValue(sheet.topFunctions?.length ? sheet.topFunctions : sheet.allFunctions);
    const functionsText = funcList
      .slice(0, 24)
      .map((f) => `${f.title || ""} ${f.general || ""}`)
      .join(" ");
    const title = node.label.replace(/\n/g, " ");
    const body = `${ref.what || ""} ${ref.techGoal || ""} ${ref.businessGoal || ""} ${ref.howWorks || ""} ${functionsText}`;
    return { title, body };
  }

  function esc(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }

  function classDetailUrl(node, sheetMeta) {
    const label = node.label.replace(/\n/g, " ").trim();
    const q = new URLSearchParams();
    q.set("nodeId", node.id);
    q.set("label", label);
    if (sheetMeta?.key) q.set("sheetKey", sheetMeta.key);
    return `class-detail.html?${q.toString()}`;
  }

  function indexMapUrl(nodeId, highlightQuery) {
    const q = new URLSearchParams();
    q.set("pickNode", nodeId);
    if (highlightQuery) q.set("q", highlightQuery);
    return `index.html?${q.toString()}`;
  }

  function mergeHighlightQuery(parts) {
    const flat = parts.map((p) => String(p || "").trim()).filter(Boolean);
    return flat.slice(0, 12).join(", ").slice(0, 400);
  }

  let vendorsByClassCache;

  function vendorsJsonUrl() {
    try {
      return new URL("kb/merged/vendors-by-class.json", window.location.href).toString();
    } catch {
      return "kb/merged/vendors-by-class.json";
    }
  }

  async function loadVendorsByClassCatalog() {
    if (vendorsByClassCache !== undefined) return vendorsByClassCache;
    try {
      const r = await fetch(vendorsJsonUrl(), { cache: "no-cache" });
      vendorsByClassCache = r.ok ? await r.json() : {};
    } catch {
      vendorsByClassCache = {};
    }
    return vendorsByClassCache;
  }

  function vendorCatalogEntriesForRow(row, cat) {
    if (!cat || typeof cat !== "object") return [];
    const rawKeys = [row.classRefKey, row.sheetKey, row.node?.label?.replace(/\n/g, " ")].filter(Boolean);
    for (const tk of rawKeys) {
      if (cat[tk]?.length) return cat[tk];
      const t = prepSearch(tk);
      for (const k of Object.keys(cat)) {
        if (prepSearch(k) === t) return cat[k];
      }
    }
    const parts = String(row.node?.label || "")
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const part of parts) {
      const t = prepSearch(part);
      for (const k of Object.keys(cat)) {
        if (prepSearch(k) === t) return cat[k];
      }
    }
    const label = prepSearch(row.node?.label?.replace(/\n/g, " ") || "");
    let best = [];
    let bestLen = 0;
    for (const k of Object.keys(cat)) {
      const ck = prepSearch(k);
      if (!ck) continue;
      if (label.includes(ck) || ck.includes(label)) {
        if (ck.length >= bestLen) {
          bestLen = ck.length;
          best = cat[k] || [];
        }
      }
    }
    return best;
  }

  function catalogEntryKey(e) {
    return `${e.vendor}\u0001${e.product}`;
  }

  async function buildCatalogPickEntries(top, tokens) {
    const cat = await loadVendorsByClassCatalog();
    if (!cat || !Object.keys(cat).length) return [];
    const dim = getBundleDimFilters();
    const VCM = window.VENDOR_CATALOG_META;
    const map = new Map();
    for (const row of top.slice(0, 12)) {
      const raw = vendorCatalogEntriesForRow(row, cat);
      const entries = VCM ? raw.filter((e) => VCM.passesDim(e, dim)) : raw;
      for (const e of entries) {
        const key = catalogEntryKey(e);
        if (map.has(key)) continue;
        const title = `${e.vendor} ${e.product}`;
        const body = `${e.description || ""} ${e.topFunctions || ""}`;
        const pickScore = scoreSearchItem({ title, body }, tokens);
        const cls = row.classRefKey || row.sheetKey || row.node.label.replace(/\n/g, " ").trim();
        map.set(key, { key, entry: e, pickScore, classLabel: cls, nodeId: row.node.id });
      }
    }
    return [...map.values()].sort((a, b) => b.pickScore - a.pickScore).slice(0, 48);
  }

  function syncCatalogPickSelection(entries) {
    const incoming = new Set(entries.map((x) => x.key));
    const next = new Set();
    for (const k of CATALOG_PICK_KEYS) if (incoming.has(k)) next.add(k);
    if (next.size === 0) entries.slice(0, 16).forEach((x) => next.add(x.key));
    CATALOG_PICK_KEYS = next;
  }

  function bundleFitLabel(sc, maxSc) {
    if (maxSc <= 0) return "Неизвестно";
    const r = sc / maxSc;
    if (r >= 0.7) return "Да";
    if (r >= 0.28) return "Частично";
    if (sc > 0) return "Частично";
    return "Нет";
  }

  function splitTheses(text) {
    const t = String(text || "").trim();
    if (!t) return [];
    const chunks = t
      .split(/\n+|(?<=[.;!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 6);
    if (chunks.length) return chunks.slice(0, 20);
    return [t];
  }

  async function buildAllFunctionRowsFromTop(top) {
    const slice = top.slice(0, 12);
    await Promise.all(slice.map((row) => ensureLazyForNode(row.node)));
    const rows = [];
    let seq = 0;
    for (const row of slice) {
      const sh = classSheetByNode(row.node);
      const data = sh?.data;
      const list = listFromValue(data?.allFunctions?.length ? data.allFunctions : data?.topFunctions);
      const zt = row.mapZoneTitle || zoneById(row.node.zoneId)?.title || "—";
      const cls = row.classRefKey || row.sheetKey || row.node.label.replace(/\n/g, " ").trim();
      const nodeLabel = row.node.label.replace(/\n/g, " ").trim();
      for (const f of list) {
        if (String(f.type || "").toLowerCase().includes("категор")) continue;
        const title = f.title || "без названия";
        const body = [f.title, f.general, f.technical, f.business].filter(Boolean).join(" ");
        const key = `${row.node.id}\u0001${sh?.key || ""}\u0001${seq}`;
        rows.push({ key, zoneTitle: zt, classLabel: cls, nodeLabel, title, body, nodeId: row.node.id, sheetKey: sh?.key || "" });
        seq += 1;
      }
    }
    return rows;
  }

  function candidatesForThesis(thesis, allRows, limit) {
    const toks = expandQueryTokens(tokenizeQuery(thesis));
    if (!toks.length) return [];
    const scored = [];
    for (const r of allRows) {
      const sc = scoreSearchItem({ title: r.title, body: r.body }, toks);
      if (sc >= 1) scored.push({ row: r, score: sc });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit || 8);
  }

  function mountCorrelationUi(rawText, top, tokens, opts) {
    const host = document.getElementById("cfgCorrelationMount");
    if (!host) return;
    const allRows = lastRunCtx?.allFunctionRows;
    if (!allRows?.length) {
      host.innerHTML = `<p class="muted">Нет строк функций в листах топ‑классов для корреляции.</p>`;
      return;
    }
    const theses = splitTheses(rawText);
    if (!theses.length) {
      host.innerHTML = "";
      return;
    }
    if (!opts?.preservePicks) corrState.thesisPicks.clear();
    const bodyRows = theses
      .map((th, ti) => {
        const cands = candidatesForThesis(th, allRows, 10);
        let sel = corrState.thesisPicks.get(ti);
        if (!opts?.preservePicks) {
          sel = new Set();
          for (const c of cands) {
            if (c.score >= 7 && sel.size < 2) sel.add(c.row.key);
          }
        } else if (!sel) {
          sel = new Set();
        }
        corrState.thesisPicks.set(ti, sel);
        const candHtml =
          cands.length > 0
            ? cands
                .map(({ row: r, score }) => {
                  const on = sel.has(r.key) ? " checked" : "";
                  const lab = `${r.zoneTitle} — ${r.classLabel}: ${r.title}`;
                  return `<label class="cfg-corr-cand"><input type="checkbox" class="cfg-corr-fn" data-thesis-ix="${ti}" data-func-key="${encodeURIComponent(
                    r.key
                  )}"${on} /><span>${esc(lab)}</span></label>`;
                })
                .join("")
            : `<span class="muted">Нет близких функций в топ‑классах — смягчите формулировку или расширьте подбор классов.</span>`;
        return `<tr><td class="cfg-corr-thesis">${esc(th)}</td><td class="cfg-corr-cands">${candHtml}</td></tr>`;
      })
      .join("");
    host.innerHTML = `<div class="cfg-corr-block">
  <h3>Корреляция: ваш текст ↔ функции KB</h3>
  <p class="muted" style="margin:0 0 8px;">Слева — фрагменты ввода; справа — примеры функций из листов классов в топе. Отметьте одну или несколько строк для каждого тезиса — они попадут в фильтр «только по введённым» в матрице ниже.</p>
  <div class="cfg-corr-scroll"><table class="cfg-corr-two"><thead><tr><th scope="col">Вы ввели</th><th scope="col">Примеры функций (из KB)</th></tr></thead><tbody>${bodyRows}</tbody></table></div>
</div>`;
  }

  function mergeQueryFuncKeys() {
    const u = new Set();
    corrState.thesisPicks.forEach((set) => {
      for (const k of set) u.add(k);
    });
    return u;
  }

  function getVisibleMatrixRows() {
    const all = lastRunCtx?.allFunctionRows || [];
    if (CFG_MX_FILTER !== "query") return { rows: all.slice(0, 120), modeLabel: "all" };
    const q = mergeQueryFuncKeys();
    if (!q.size) return { rows: all.slice(0, 120), modeLabel: "query-empty" };
    const hit = all.filter((r) => q.has(r.key));
    if (hit.length) return { rows: hit.slice(0, 120), modeLabel: "query-hit", hitCount: hit.length };
    return { rows: all.slice(0, 120), modeLabel: "query-fallback" };
  }

  function strictTokensFromRow(fRow) {
    const s = `${fRow.title || ""} ${fRow.body || ""}`;
    return prepSearch(s)
      .split(/[^a-z0-9а-яіїєґ]+/i)
      .filter((t) => t.length >= 3)
      .slice(0, 36);
  }

  function buildMxScoreMatrix(mRows, pickedCat) {
    const n = mRows.length;
    const p = pickedCat.length;
    const rowToks = new Array(n);
    for (let i = 0; i < n; i++) rowToks[i] = strictTokensFromRow(mRows[i]);
    const matrix = new Array(n);
    for (let i = 0; i < n; i++) {
      const row = new Array(p);
      const toks = rowToks[i];
      if (toks.length) {
        for (let j = 0; j < p; j++) {
          const e = pickedCat[j].entry;
          row[j] = scoreSearchItem(
            { title: `${e.vendor} ${e.product}`, body: `${e.description || ""} ${e.topFunctions || ""}` },
            toks
          );
        }
      } else {
        for (let j = 0; j < p; j++) row[j] = 0;
      }
      matrix[i] = row;
    }
    return matrix;
  }

  function statusesFromMxScoreRow(scoreRow) {
    let maxSc = 0;
    for (let j = 0; j < scoreRow.length; j++) if (scoreRow[j] > maxSc) maxSc = scoreRow[j];
    const out = new Array(scoreRow.length);
    for (let j = 0; j < scoreRow.length; j++) out[j] = productStatusFromRelative(scoreRow[j], maxSc);
    return out;
  }

  function coveragePctsFromMxMatrix(matrix) {
    const n = matrix.length;
    if (!n) return [];
    const p = matrix[0].length;
    const sums = new Array(p).fill(0);
    for (let i = 0; i < n; i++) {
      const sts = statusesFromMxScoreRow(matrix[i]);
      for (let j = 0; j < p; j++) sums[j] += statusWeight(sts[j]);
    }
    return sums.map((s) => Math.min(100, Math.round((100 * s) / n)));
  }

  function productStatusFromRelative(sc, maxSc) {
    if (maxSc < 1) return sc >= 2 ? "part" : sc >= 1 ? "part" : "unk";
    const r = sc / maxSc;
    if (sc >= 9 && r >= 0.82) return "yes";
    if (r >= 0.35 || sc >= 5) return "part";
    if (sc >= 2) return "part";
    return "no";
  }

  function getBundleDimFilters() {
    if (!window.VENDOR_CATALOG_META) return { region: "all", oss: "all" };
    return {
      region: document.getElementById("cfgBundleRegion")?.value || "all",
      oss: document.getElementById("cfgBundleOss")?.value || "all"
    };
  }

  async function buildBundleHtmlFromTopClasses(top, tokens) {
    try {
      const cat = await loadVendorsByClassCatalog();
      if (!cat || !Object.keys(cat).length) {
        return `<div class="cfg-subh">Подобранный бандл (продукты)</div><p class="muted">Нет данных каталога (<code>kb/merged/vendors-by-class.json</code>). Запустите <code>npm run merge-landscape</code> и откройте страницу с локального/деплой-сервера (не file://).</p>`;
      }
      const rows = [];
      const dim = getBundleDimFilters();
      const VCM = window.VENDOR_CATALOG_META;
      for (const row of top.slice(0, 10)) {
        const rawEntries = vendorCatalogEntriesForRow(row, cat);
        const entries = VCM ? rawEntries.filter((e) => VCM.passesDim(e, dim)) : rawEntries;
        const labelPlain = row.node.label.replace(/\n/g, " ").trim();
        const canonical = row.classRefKey || row.sheetKey || labelPlain;
        if (!entries.length) {
          rows.push({ canonical, labelPlain, top3: [] });
          continue;
        }
        const scored = entries
          .map((e) => {
            const title = `${e.vendor} ${e.product}`;
            const body = `${e.description || ""} ${e.topFunctions || ""}`;
            return { e, score: scoreSearchItem({ title, body }, tokens) };
          })
          .sort((a, b) => b.score - a.score);
        rows.push({ canonical, labelPlain, top3: scored.slice(0, 3) });
      }
      const picked = rows.filter((r) => r.top3.length).length;
      const hint =
        picked > 0
          ? `По каждому классу из топа — до 3 продуктов из каталога; в ячейке — оценка соответствия запросу (Да / Частично / Нет / Неизвестно). Зелёная рамка — лучший вариант в строке.`
          : "Не удалось сопоставить классы с ключами каталога — проверьте vendors-by-class.json.";
      function cellTop3(top3) {
        const slots = [0, 1, 2].map((i) => top3[i] || null);
        const maxSc = top3.reduce((m, x) => Math.max(m, x.score), 0);
        return slots
          .map((pick) => {
            if (!pick) return '<td><span class="muted">—</span></td>';
            const lead = maxSc > 0 && pick.score === maxSc ? " cfg-bundle-pick--lead" : "";
            const snippet = esc(String(pick.e.description || "").slice(0, 140));
            const tail = String(pick.e.description || "").length > 140 ? "…" : "";
            const fit = bundleFitLabel(pick.score, maxSc);
            return `<td><div class="cfg-bundle-pick${lead}"><span class="cfg-bundle-score">${esc(fit)}</span><b>${esc(pick.e.vendor)}</b> — ${esc(pick.e.product)}<div class="muted" style="font-size:10px;margin-top:4px;">${snippet}${tail}</div></div></td>`;
          })
          .join("");
      }
      const tr = rows
        .map(
          (r) =>
            `<tr><td><b>${esc(r.canonical)}</b><div class="muted" style="font-size:11px;">${esc(r.labelPlain)}</div></td>${cellTop3(r.top3)}</tr>`
        )
        .join("");
      return `<div class="cfg-subh">Бандл: топ‑3 продукта на класс</div><p class="muted" style="margin-bottom:8px;">${hint}</p><table class="cfg-vt" aria-label="Бандл"><thead><tr><th>Класс</th><th>Топ‑1</th><th>Топ‑2</th><th>Топ‑3</th></tr></thead><tbody>${tr}</tbody></table>`;
    } catch (err) {
      console.error(err);
      return `<div class="cfg-subh">Бандл</div><p class="muted">Ошибка при подборе бандла. Проверьте консоль и доступность <code>kb/merged/vendors-by-class.json</code>.</p>`;
    }
  }

  function isFreeMode() {
    return !!document.getElementById("cfgModeFree")?.checked;
  }

  function getChipTargetTextarea() {
    if (isFreeMode()) return document.getElementById("cfgFreeText");
    return document.querySelector(".cfg-zone-row .cfg-zone-text");
  }

  function themeActiveForTokens(gi, tokens) {
    const g = THESAURUS_GROUPS[gi];
    return tokens.some((t) =>
      g.some((k) => {
        const pt = prepSearch(t);
        const pk = prepSearch(k);
        if (!pk || pk.length < 2) return false;
        return pt.includes(pk) || pk.includes(pt) || stemToken(pt) === stemToken(pk);
      })
    );
  }

  function activeThemeIndices(tokens) {
    const out = [];
    for (let i = 0; i < THESAURUS_GROUPS.length; i++) {
      if (themeActiveForTokens(i, tokens)) out.push(i);
    }
    return out;
  }

  function statusWeight(st) {
    if (st === "yes") return 1;
    if (st === "part") return 0.45;
    if (st === "unk") return 0;
    return 0;
  }

  function statusLabelRu(st) {
    if (st === "yes") return { t: "Да", c: "cfg-st-yes" };
    if (st === "part") return { t: "Частично", c: "cfg-st-part" };
    if (st === "unk") return { t: "Неизвестно", c: "cfg-st-unk" };
    return { t: "Нет", c: "cfg-st-no" };
  }

  function buildProjectMapPayload() {
    if (!lastRunCtx) return null;
    const entries = (lastRunCtx.catalogEntries || []).filter((x) => CATALOG_PICK_KEYS.has(x.key));
    if (!entries.length) return null;
    const focusNodeIds = [];
    const seen = new Set();
    for (const x of entries) {
      const nid = x.nodeId;
      if (nid && !seen.has(nid)) {
        seen.add(nid);
        focusNodeIds.push(nid);
      }
    }
    if (!focusNodeIds.length && lastRunCtx.topClasses?.length) {
      for (const x of entries) {
        const want = prepSearch(x.classLabel || "");
        if (!want) continue;
        for (const row of lastRunCtx.topClasses) {
          const lab = prepSearch(row.classRefKey || row.sheetKey || row.node.label.replace(/\n/g, " "));
          if (!lab) continue;
          if (lab === want || lab.includes(want) || want.includes(lab)) {
            if (!seen.has(row.node.id)) {
              seen.add(row.node.id);
              focusNodeIds.push(row.node.id);
            }
            break;
          }
        }
      }
    }
    if (!focusNodeIds.length) return null;
    const picks = entries.map((x) => ({
      key: x.key,
      vendor: x.entry.vendor,
      product: x.entry.product,
      nodeId: x.nodeId,
      classLabel: x.classLabel
    }));
    const vendorsByNode = {};
    for (const x of entries) {
      if (!x.nodeId) continue;
      if (!vendorsByNode[x.nodeId]) vendorsByNode[x.nodeId] = [];
      const v = x.entry.vendor;
      if (!vendorsByNode[x.nodeId].includes(v)) vendorsByNode[x.nodeId].push(v);
    }
    return {
      v: 1,
      focusNodeIds,
      picks,
      vendorsByNode,
      clientInfra: [],
      requirementSummary: lastRunCtx.requirementSummary || ""
    };
  }

  function openProjectMapFromConfigurator() {
    const data = buildProjectMapPayload();
    if (!data) return;
    try {
      localStorage.setItem(PROJECT_MAP_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("projectMap localStorage", e);
    }
    const u = new URL("index.html", window.location.href);
    u.searchParams.set("projectMap", "1");
    try {
      const json = JSON.stringify(data);
      u.hash = "pm=" + encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
    } catch (e) {
      console.warn("projectMap hash", e);
    }
    window.open(u.href, "_blank", "noopener,noreferrer");
  }

  function renderOutcomeSummary() {
    const el = document.getElementById("cfgOutcomePanel");
    const wrap = document.getElementById("cfgOutcomeWrap");
    if (!el || !lastRunCtx) {
      if (el) el.innerHTML = "";
      if (wrap) wrap.classList.add("cfg-hidden");
      return;
    }
    if (wrap) wrap.classList.remove("cfg-hidden");
    const picked = (lastRunCtx.catalogEntries || []).filter((x) => CATALOG_PICK_KEYS.has(x.key));
    if (!picked.length) {
      el.innerHTML = `<p class="muted">Отметьте финальный набор продуктов вендоров выше — затем откройте схему проекта.</p>`;
      return;
    }
    const n = picked.length;
    const canMap = !!buildProjectMapPayload();
    el.innerHTML = `<div class="cfg-subh">Итоговый набор</div>
      <p class="muted" style="margin:0 0 10px;">Выбрано продуктов в каталоге: <b>${n}</b>. Откроется вкладка со схемой: <b>только классы из выбора</b> и связи между ними (без «раздувания» через весь граф). Данные передаются в localStorage и дублируются в адресе вкладки. На карте класс → база с фильтром по вендорам.</p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
        <button type="button" class="btn btn-primary" id="cfgOpenProjectMapBtn"${canMap ? "" : " disabled"}>Визуализировать на схеме</button>
        ${canMap ? "" : `<span class="muted" style="font-size:11px;">Нет привязки к узлам схемы — выполните подбор ещё раз.</span>`}
      </div>
      <details style="margin-top:12px;font-size:12px;"><summary class="muted" style="cursor:pointer;">Состав выбора</summary>
        <ul style="margin:8px 0 0;padding-left:1.1rem;">${picked
          .map((x) => `<li><b>${esc(x.entry.vendor)}</b> — ${esc(x.entry.product)} <span class="muted">(${esc(x.classLabel)})</span></li>`)
          .join("")}</ul>
      </details>`;
  }

  function renderVendorDetail() {
    const host = document.getElementById("cfgVendorDetail");
    if (!host || !lastRunCtx) {
      if (host) host.innerHTML = `<p class="muted">Сначала выполните подбор — появятся продукты каталога и матрица по функциям листов.</p>`;
      renderOutcomeSummary();
      return;
    }
    const catRows = lastRunCtx.catalogEntries || [];
    const pickedCat = catRows.filter((x) => CATALOG_PICK_KEYS.has(x.key));
    if (!pickedCat.length) {
      host.innerHTML = `<p class="muted">Отметьте один или несколько <b>продуктов из каталога</b> — покажем матрицу «Да / Нет / Частично / Неизвестно» по строкам функций (зона → класс → функция).</p>`;
      renderOutcomeSummary();
      return;
    }
    const { rows: mRows, modeLabel, hitCount } = getVisibleMatrixRows();
    if (!mRows.length) {
      host.innerHTML = `<p class="muted">Нет строк функций в листах топ‑классов — выполните подбор классов ещё раз или уточните запрос.</p>`;
      renderOutcomeSummary();
      return;
    }
    const qKeys = mergeQueryFuncKeys();
    const filterHint =
      modeLabel === "query-empty"
        ? `<p class="muted" style="font-size:11px;">Фильтр «только по отмеченным в корреляции»: пока ничего не отмечено — показаны все функции топа.</p>`
        : modeLabel === "query-fallback"
          ? `<p class="muted" style="font-size:11px;">Отмеченные функции не вошли в выгрузку топ‑классов — показан полный список функций.</p>`
          : modeLabel === "query-hit"
            ? `<p class="muted" style="font-size:11px;">Показаны только строки, отмеченные в корреляции (${hitCount || qKeys.size}).</p>`
            : "";

    const allBtnCls = CFG_MX_FILTER === "all" ? " btn-primary" : "";
    const qBtnCls = CFG_MX_FILTER === "query" ? " btn-primary" : "";
    const mxMatrix = buildMxScoreMatrix(mRows, pickedCat);
    const pctVals = coveragePctsFromMxMatrix(mxMatrix);

    const headProd = pickedCat
      .map((x) => `<th scope="col" class="cfg-mx-prod" title="${esc(x.entry.vendor + " — " + x.entry.product)}">${esc(x.entry.vendor)} — ${esc(x.entry.product)}</th>`)
      .join("");
    const body = mRows
      .map((r, ri) => {
        const sts = statusesFromMxScoreRow(mxMatrix[ri]);
        const cells = sts
          .map((st) => {
            const { t, c } = statusLabelRu(st);
            return `<td class="${c}">${esc(t)}</td>`;
          })
          .join("");
        return `<tr${qKeys.has(r.key) ? ` class="cfg-fn-from-query"` : ""}><td>${esc(r.zoneTitle)}</td><td>${esc(r.classLabel)}</td><td>${esc(r.title)}</td>${cells}</tr>`;
      })
      .join("");

    const pctCat = pickedCat.map((x, j) => {
      const pct = pctVals[j] ?? 0;
      return `<div style="flex:1;min-width:120px;"><div class="muted" style="font-size:11px;">${esc(x.entry.vendor)} — ${esc(x.entry.product)}</div><div class="cfg-pct">${pct}%</div><div class="muted" style="font-size:10px;">по видимым строкам функций</div></div>`;
    });

    host.innerHTML = `
      <div class="cfg-mx-filt" role="toolbar" aria-label="Фильтр строк матрицы">
        <span class="muted" style="font-size:11px;font-weight:600;">Строки матрицы:</span>
        <button type="button" class="btn cfg-mx-tog${allBtnCls}" data-cfg-mx="all">все функции топа</button>
        <button type="button" class="btn cfg-mx-tog${qBtnCls}" data-cfg-mx="query">только отмеченные в корреляции</button>
      </div>
      ${filterHint}
      <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;margin-top:8px;">${pctCat.join("")}</div>
      <div class="cfg-mx-scroll"><table class="cfg-vt cfg-mx-table" aria-label="Зона, класс, функция и покрытие продуктами">
        <thead><tr><th scope="col">Зона</th><th scope="col">Класс</th><th scope="col">Функция (лист KB)</th>${headProd}</tr></thead>
        <tbody>${body}</tbody>
      </table></div>
      <div class="cfg-composite"><b>Примечание</b>: оценка в ячейке — пересечение текста <i>конкретной функции</i> с карточкой продукта (без «раздувания» тезауруса), внутри строки продукты сравниваются между собой. Строки с зелёной подсветкой — отмечены в корреляции «ввод ↔ KB».</div>
    `;
    renderOutcomeSummary();
  }

  function renderVendorPick() {
    const host = document.getElementById("cfgVendorPick");
    if (!host) return;
    const cat = lastRunCtx?.catalogEntries || [];
    let html = "";
    if (cat.length) {
      html += `<div class="muted" style="font-size:11px;margin-bottom:6px;">Продукты из каталога под текущий подбор — отметьте для матрицы «Да / Нет / Частично / Неизвестно» по функциям листов:</div>`;
      html += `<div class="cfg-catalog-picks">`;
      for (const row of cat) {
        const e = row.entry;
        const checked = CATALOG_PICK_KEYS.has(row.key) ? " checked" : "";
        html += `<label><input type="checkbox" class="cfg-cat-pick" data-cat-key="${esc(row.key)}"${checked} /> ${esc(e.vendor)} — ${esc(e.product)} <span class="muted">(${esc(row.classLabel)})</span></label>`;
      }
      html += `</div>`;
    } else if (lastRunCtx) {
      html += `<p class="muted" style="font-size:11px;">Каталог вендоров пуст или не загрузился.</p>`;
    } else {
      html += `<p class="muted" style="font-size:11px;">Сначала выполните подбор классов или бандла.</p>`;
    }
    host.innerHTML = html;
    host.querySelectorAll("input.cfg-cat-pick").forEach((el) => {
      el.addEventListener("change", () => {
        const key = el.getAttribute("data-cat-key");
        if (!key) return;
        if (el.checked) CATALOG_PICK_KEYS.add(key);
        else CATALOG_PICK_KEYS.delete(key);
        renderVendorDetail();
      });
    });
    renderOutcomeSummary();
  }

  function buildClassCardHtml(row, hl, options) {
    const n = row.node;
    const labelPlain = n.label.replace(/\n/g, " ").trim();
    const canonical = row.classRefKey || row.sheetKey || labelPlain;
    const subParts = [];
    if (row.classRefKey && row.sheetKey && row.classRefKey !== row.sheetKey) {
      subParts.push(`Справочник: <b>${esc(row.classRefKey)}</b> · лист: <code>${esc(row.sheetKey)}</code>`);
    } else if (row.classRefKey) {
      subParts.push(`Класс (справочник): <b>${esc(row.classRefKey)}</b>`);
    } else if (row.sheetKey) {
      subParts.push(`Лист KB: <code>${esc(row.sheetKey)}</code>`);
    }
    subParts.push(`На схеме: <b>${esc(labelPlain)}</b>`);
    if (row.mapZoneTitle) subParts.push(`Зона карты: ${esc(row.mapZoneTitle)}`);

    let chips = "";
    let metaLine = "";
    if (options?.mode === "zones") {
      chips = row.perZone
        .filter((z) => !z.skipped)
        .map((z) => {
          const cls = z.score > 0 ? "cfg-chip-hit" : "cfg-chip-miss";
          return `<span class="cfg-zone-chip ${cls}" title="${esc(z.title)}">${esc(z.title)}: ${z.score}</span>`;
        })
        .join("");
      const globalLine =
        row.globalTokens?.length > 0
          ? `<div class="cfg-global-line"><span class="cfg-zone-chip ${row.globalScore > 0 ? "cfg-chip-hit" : "cfg-chip-miss"}">Общий контекст: ${row.globalScore}</span></div>`
          : "";
      chips += globalLine;
      const covPct = Math.round((row.coverage || 0) * 100);
      metaLine = `<div class="cfg-card-meta">Итого ${Math.round(row.total * 10) / 10} · зоны с совпадениями ${row.matchedActive}/${row.activeZoneCount || 0} (${covPct}%)</div>`;
    } else {
      chips = `<span class="cfg-zone-chip ${row.freeScore > 0 ? "cfg-chip-hit" : "cfg-chip-miss"}">Скоуп: ${row.freeScore}</span>`;
      if (row.zoneBoost > 0) {
        chips += ` <span class="cfg-zone-chip cfg-chip-hit" title="Совпадение с предложенной зоной">+зона «${esc(row.zoneBoostTitle || "")}»</span>`;
      }
      metaLine = `<div class="cfg-card-meta">Итого ${Math.round(row.total * 10) / 10}${row.zoneBoost ? " (с бонусом за зону паутины)" : ""}</div>`;
    }

    const mapHref = indexMapUrl(n.id, hl);
    const detailHref = classDetailUrl(n, row.sheetMeta);

    return `<article class="cfg-card" data-node-id="${esc(n.id)}">
  <div class="cfg-card-score">${Math.round(row.total * 10) / 10}</div>
  <h3 class="cfg-card-class">${esc(canonical)}</h3>
  <div class="cfg-card-sub muted">${subParts.join(" · ")}</div>
  ${metaLine}
  <div class="cfg-zone-chips">${chips}</div>
  <div class="cfg-card-actions">
    <a class="btn btn-primary" href="${esc(mapHref)}">На схеме + база</a>
    <a class="btn" href="${esc(detailHref)}">Лист функций</a>
  </div>
</article>`;
  }

  async function runModeZones(statusEl, resultsEl, outputKind) {
    const globalTa = document.getElementById("cfgZonesGlobalContext");
    const zoneRows = Array.from(document.querySelectorAll(".cfg-zone-row"));
    const zoneQueries = [];
    for (const row of zoneRows) {
      const title = row.querySelector(".cfg-zone-title")?.value?.trim() || "Зона";
      const text = row.querySelector(".cfg-zone-text")?.value?.trim() || "";
      const rawToks = tokenizeQuery(text);
      const tokens = expandQueryTokens(rawToks);
      zoneQueries.push({ title, text, tokens });
    }

    const globalText = String(globalTa?.value || "").trim();
    const globalTokens = globalText ? expandQueryTokens(tokenizeQuery(globalText)) : [];

    const hasAnyZoneTokens = zoneQueries.some((z) => z.tokens.length);
    if (!hasAnyZoneTokens && !globalTokens.length) {
      if (statusEl) statusEl.textContent = "Заполните хотя бы одну зону требований или общий контекст.";
      resultsEl.innerHTML = "";
      lastRunCtx = null;
      CATALOG_PICK_KEYS = new Set();
      corrState.thesisPicks.clear();
      CFG_MX_FILTER = "all";
      renderVendorPick();
      renderVendorDetail();
      return;
    }

    if (statusEl) statusEl.textContent = "Загрузка листов классов и подбор…";
    resultsEl.innerHTML = "";

    const scored = [];
    for (const n of MAP.nodes) {
      const item = buildNodeSearchItemShallow(n);
      const refMeta = classRefByNode(n);
      const sheetMeta = classSheetByNode(n);
      const classRefKey = refMeta?.key || "";
      const sheetKey = sheetMeta?.key || "";

      const perZone = zoneQueries.map((zq) => ({
        title: zq.title,
        score: zq.tokens.length ? scoreSearchItem(item, zq.tokens) : 0,
        skipped: !zq.tokens.length
      }));
      const zoneSum = perZone.reduce((a, z) => a + z.score, 0);
      const globalScore = globalTokens.length ? scoreSearchItem(item, globalTokens) : 0;
      const total = zoneSum + globalScore * 1.15;

      const activeZones = perZone.filter((z) => !z.skipped);
      const matchedActive = activeZones.filter((z) => z.score > 0).length;
      const coverage = activeZones.length ? matchedActive / activeZones.length : 1;

      if (total <= 0) continue;

      const z = n.zoneId ? zoneById(n.zoneId) : null;
      scored.push({
        node: n,
        classRefKey,
        sheetKey,
        refMeta,
        sheetMeta,
        mapZoneTitle: z?.title || "",
        perZone,
        globalTokens,
        globalScore,
        total,
        coverage,
        matchedActive,
        activeZoneCount: activeZones.length
      });
    }

    scored.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.coverage !== a.coverage) return b.coverage - a.coverage;
      return b.matchedActive - a.matchedActive;
    });

    const top = scored.slice(0, 16);
    const hlParts = zoneQueries.filter((z) => z.text).map((z) => z.text);
    if (globalText) hlParts.push(globalText);
    const hl = mergeHighlightQuery(hlParts);
    const allToks = expandQueryTokens(tokenizeQuery(hlParts.join(" ")));

    if (statusEl) {
      statusEl.textContent = top.length
        ? `Режим «зоны»: показано классов ${top.length}. Сортировка: сумма по зонам + общий контекст; затем покрытие зон.`
        : "Нет совпадений — смягчите формулировки.";
    }

    if (!top.length) {
      resultsEl.innerHTML = `<p class="muted">Попробуйте тезаурус: ITSM, CMDB, лицензии, IAM, мониторинг…</p>`;
      lastRunCtx = null;
      CATALOG_PICK_KEYS = new Set();
      corrState.thesisPicks.clear();
      CFG_MX_FILTER = "all";
      renderVendorPick();
      renderVendorDetail();
      return;
    }

    const catPackZones = await buildCatalogPickEntries(top, allToks);
    syncCatalogPickSelection(catPackZones);
    const allFunctionRowsZones = await buildAllFunctionRowsFromTop(top);
    const corrMount = `<div id="cfgCorrelationMount" class="cfg-corr-mount"></div>`;
    const cardsHtml = corrMount + `<div class="cfg-subh">Классы решений</div>` + top.map((row) => buildClassCardHtml(row, hl, { mode: "zones" })).join("");
    const corrRawZones = hlParts.join("\n\n").trim() || hl;
    if (outputKind === "bundle") {
      resultsEl.innerHTML = corrMount + (await buildBundleHtmlFromTopClasses(top, allToks));
    } else {
      resultsEl.innerHTML = cardsHtml;
    }

    corrState.thesisPicks.clear();
    CFG_MX_FILTER = "all";
    lastRunCtx = {
      mode: "zones",
      outputKind,
      requirementSummary: hl,
      tokens: allToks,
      activeThemeIndices: activeThemeIndices(allToks),
      topClasses: top.slice(0, 8),
      catalogEntries: catPackZones,
      allFunctionRows: allFunctionRowsZones
    };
    renderVendorPick();
    renderVendorDetail();
    mountCorrelationUi(corrRawZones, top, allToks);
  }

  async function runModeFree(statusEl, resultsEl, outputKind) {
    const ta = document.getElementById("cfgFreeText");
    const raw = String(ta?.value || "").trim();
    const globalFree = String(document.getElementById("cfgGlobalContext")?.value || "").trim();
    const lineFns = getFreeFunctionLineTexts();
    const combinedRaw = [raw, globalFree, ...lineFns].filter(Boolean).join("\n").trim();
    const rawToks = tokenizeQuery(combinedRaw);
    const tokens = expandQueryTokens(rawToks);

    if (!tokens.length) {
      if (statusEl) statusEl.textContent = "Введите абзац скоупа и/или строки функций (слова от 2 букв; лучше 3+).";
      resultsEl.innerHTML = "";
      lastRunCtx = null;
      CATALOG_PICK_KEYS = new Set();
      corrState.thesisPicks.clear();
      CFG_MX_FILTER = "all";
      renderVendorPick();
      renderVendorDetail();
      return;
    }

    if (statusEl) statusEl.textContent = "Подбор зон паутины и классов…";
    resultsEl.innerHTML = "";

    const zoneScored = [];
    for (const z of MAP.zones) {
      const item = buildZoneSearchItem(z.id);
      const s = scoreSearchItem(item, tokens);
      if (s > 0) zoneScored.push({ zone: z, score: s });
    }
    zoneScored.sort((a, b) => b.score - a.score);
    const topZones = zoneScored.slice(0, 5);
    const topZoneIdSet = new Set(topZones.map((x) => x.zone.id));

    const scored = [];
    for (const n of MAP.nodes) {
      const item = buildNodeSearchItemShallow(n);
      const refMeta = classRefByNode(n);
      const sheetMeta = classSheetByNode(n);
      const classRefKey = refMeta?.key || "";
      const sheetKey = sheetMeta?.key || "";
      const freeScore = scoreSearchItem(item, tokens);
      let zoneBoost = 0;
      let zoneBoostTitle = "";
      if (n.zoneId && topZoneIdSet.has(n.zoneId)) {
        const zr = topZones.find((t) => t.zone.id === n.zoneId);
        zoneBoost = Math.min(18, Math.round((zr?.score || 0) * 0.35));
        zoneBoostTitle = zoneById(n.zoneId)?.title || n.zoneId;
      }
      const total = freeScore + zoneBoost;
      if (total <= 0) continue;
      const z = n.zoneId ? zoneById(n.zoneId) : null;
      scored.push({
        node: n,
        classRefKey,
        sheetKey,
        refMeta,
        sheetMeta,
        mapZoneTitle: z?.title || "",
        freeScore,
        zoneBoost,
        zoneBoostTitle,
        total
      });
    }

    scored.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return b.freeScore - a.freeScore;
    });

    const top = scored.slice(0, 16);
    const hl = mergeHighlightQuery([combinedRaw]);

    const zoneBlock =
      topZones.length > 0
        ? `<div class="cfg-subh">Предлагаемые зоны паутины</div>
<div class="cfg-zone-rec">${topZones
            .map(
              (r) =>
                `<div class="cfg-zone-rec-card"><div><b>${esc(r.zone.title)}</b><div class="muted" style="margin-top:4px;font-size:11px;">По тексту справочника зоны в KB</div></div><div><span class="cfg-zone-chip cfg-chip-hit">скор ${r.score}</span></div></div>`
            )
            .join("")}</div>`
        : `<p class="muted">Зоны не выделились по запросу — попробуйте другие формулировки (ITSM, discovery, CMDB…).</p>`;

    if (statusEl) {
      statusEl.textContent = top.length
        ? `Режим «свободный текст»: зон с совпадениями ${topZones.length}, классов в топе ${top.length}.`
        : "Классы не найдены — расширьте описание.";
    }

    if (!top.length) {
      resultsEl.innerHTML = zoneBlock + `<p class="muted" style="margin-top:12px;">Классы не ранжированы — уточните ИТ-термины.</p>`;
      syncCatalogPickSelection([]);
      corrState.thesisPicks.clear();
      CFG_MX_FILTER = "all";
      lastRunCtx = {
        mode: "free",
        outputKind,
        requirementSummary: hl,
        tokens,
        activeThemeIndices: activeThemeIndices(tokens),
        topClasses: [],
        catalogEntries: [],
        allFunctionRows: []
      };
      renderVendorPick();
      renderVendorDetail();
      return;
    }

    const catPackFree = await buildCatalogPickEntries(top, tokens);
    syncCatalogPickSelection(catPackFree);
    const allFunctionRowsFree = await buildAllFunctionRowsFromTop(top);
    const corrMount = `<div id="cfgCorrelationMount" class="cfg-corr-mount"></div>`;

    const cardsHtml =
      zoneBlock +
      corrMount +
      `<div class="cfg-subh">Классы решений</div>` +
      top.map((row) => buildClassCardHtml(row, hl, { mode: "free" })).join("");
    const bundleStep1Extra = `<div class="panel" style="margin-top:14px;padding:12px 14px;">
      <p class="muted" style="margin:0 0 10px;"><b>Шаг 1.</b> В таблице корреляции отметьте функции KB, которые соответствуют вашему запросу. Затем нажмите «Шаг 2» — построится таблица бандла (топ‑3 на класс).</p>
      <button type="button" class="btn btn-primary" id="cfgFinalizeFreeBundleBtn">Шаг 2: подобрать бандл</button>
    </div>`;
    const wasSecondBundlePass = outputKind === "bundle" && FREE_BUNDLE_STEP2;
    if (outputKind === "bundle" && !FREE_BUNDLE_STEP2) {
      resultsEl.innerHTML = zoneBlock + corrMount + `<div class="cfg-subh">Классы (шаг 1 перед бандлом)</div>` + top.map((row) => buildClassCardHtml(row, hl, { mode: "free" })).join("") + bundleStep1Extra;
    } else if (wasSecondBundlePass) {
      resultsEl.innerHTML = zoneBlock + corrMount + (await buildBundleHtmlFromTopClasses(top, tokens));
      FREE_BUNDLE_STEP2 = false;
    } else {
      resultsEl.innerHTML = cardsHtml;
    }

    if (!wasSecondBundlePass) {
      corrState.thesisPicks.clear();
      CFG_MX_FILTER = "all";
    }
    lastRunCtx = {
      mode: "free",
      outputKind,
      requirementSummary: hl,
      tokens,
      activeThemeIndices: activeThemeIndices(tokens),
      topClasses: top.slice(0, 8),
      catalogEntries: catPackFree,
      allFunctionRows: allFunctionRowsFree
    };
    renderVendorPick();
    renderVendorDetail();
    mountCorrelationUi(combinedRaw, top, tokens, { preservePicks: wasSecondBundlePass });
  }

  function getFreeFunctionLineTexts() {
    const host = document.getElementById("cfgFreeFuncLines");
    if (!host) return [];
    return [...host.querySelectorAll("input.cfg-free-func-line")]
      .map((inp) => String(inp.value || "").trim())
      .filter(Boolean);
  }

  function setCfgLoading(on, text) {
    const el = document.getElementById("cfgLoader");
    const tx = document.getElementById("cfgLoaderText");
    const btns = [document.getElementById("cfgRunClassesBtn"), document.getElementById("cfgRunBundleBtn")];
    if (tx && text) tx.textContent = text;
    if (el) el.classList.toggle("cfg-hidden", !on);
    btns.forEach((b) => {
      if (b) b.disabled = !!on;
    });
  }

  async function runConfigurator(outputKind) {
    const statusEl = document.getElementById("cfgStatus");
    const resultsEl = document.getElementById("cfgResults");
    if (!resultsEl) return;
    const kind = outputKind === "bundle" ? "bundle" : "classes";
    if (kind === "classes") FREE_BUNDLE_STEP2 = false;
    let loadMsg = "Подбор классов…";
    if (kind === "bundle") {
      if (isFreeMode() && FREE_BUNDLE_STEP2) loadMsg = "Финальный бандл после корреляции…";
      else if (isFreeMode()) loadMsg = "Шаг 1: классы и корреляция…";
      else loadMsg = "Подбор бандла…";
    }
    setCfgLoading(true, loadMsg);
    resultsEl.innerHTML = "";
    try {
      if (kind === "bundle") await loadVendorsByClassCatalog();
      if (isFreeMode()) await runModeFree(statusEl, resultsEl, kind);
      else await runModeZones(statusEl, resultsEl, kind);
    } catch (e) {
      console.error(e);
      if (statusEl) statusEl.textContent = "Ошибка подбора — см. консоль браузера.";
      resultsEl.innerHTML = `<p class="muted">Сбой выполнения. Убедитесь, что страница открыта через http(s), а не file://.</p>`;
      lastRunCtx = null;
      CATALOG_PICK_KEYS = new Set();
      corrState.thesisPicks.clear();
      CFG_MX_FILTER = "all";
      FREE_BUNDLE_STEP2 = false;
      renderVendorPick();
      renderVendorDetail();
    } finally {
      setCfgLoading(false, "Подбор…");
    }
  }

  function syncModeUi() {
    const zonesBlock = document.getElementById("cfgBlockZones");
    const freeBlock = document.getElementById("cfgBlockFree");
    const gl = document.getElementById("cfgGlobalContextWrap");
    const zw = document.getElementById("cfgZoneWizard");
    if (!zonesBlock || !freeBlock) return;
    if (isFreeMode()) {
      zonesBlock.classList.add("cfg-hidden");
      freeBlock.classList.remove("cfg-hidden");
      if (gl) gl.classList.remove("cfg-hidden");
      if (zw) zw.classList.add("cfg-hidden");
    } else {
      zonesBlock.classList.remove("cfg-hidden");
      freeBlock.classList.add("cfg-hidden");
      if (gl) gl.classList.add("cfg-hidden");
      if (zw) zw.classList.remove("cfg-hidden");
      initZoneWizardUi();
    }
  }

  function addZoneRow(title, placeholder) {
    const host = document.getElementById("cfgZonesHost");
    if (!host) return;
    const row = document.createElement("div");
    row.className = "cfg-zone-row panel";
    const head = document.createElement("div");
    head.className = "cfg-zone-row-head";
    const inp = document.createElement("input");
    inp.type = "text";
    inp.className = "cfg-zone-title search-input";
    inp.setAttribute("aria-label", "Название зоны");
    inp.value = title;
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "btn btn-ghost cfg-zone-remove";
    rm.textContent = "Удалить зону";
    const ta = document.createElement("textarea");
    ta.className = "cfg-zone-text search-input";
    ta.rows = 3;
    ta.placeholder = placeholder;
    head.appendChild(inp);
    head.appendChild(rm);
    row.appendChild(head);
    row.appendChild(ta);
    host.appendChild(row);
    rm.addEventListener("click", () => {
      if (document.querySelectorAll(".cfg-zone-row").length <= 1) return;
      row.remove();
    });
  }

  function initZoneWizardUi() {
    const zsel = document.getElementById("cfgWzZone");
    const nhost = document.getElementById("cfgWzNodes");
    if (!zsel || !nhost || zsel.dataset.bound === "1") return;
    zsel.dataset.bound = "1";
    zsel.innerHTML = MAP.zones.map((z) => `<option value="${esc(z.id)}">${esc(z.title)}</option>`).join("");
    function renderWzNodes() {
      const zid = zsel.value;
      nhost.innerHTML = MAP.nodes
        .filter((n) => n.zoneId === zid)
        .map(
          (n) =>
            `<label style="display:block;font-size:11px;margin:3px 0;"><input type="checkbox" class="cfg-wz-node" value="${esc(
              n.id
            )}" /> ${esc(n.label.replace(/\n/g, " "))}</label>`
        )
        .join("");
    }
    zsel.addEventListener("change", renderWzNodes);
    renderWzNodes();
    document.getElementById("cfgWzLoadFns")?.addEventListener("click", async () => {
      const ids = [...nhost.querySelectorAll("input.cfg-wz-node:checked")].map((x) => x.value);
      const fwrap = document.getElementById("cfgWzFns");
      if (!fwrap || !ids.length) return;
      await Promise.all(ids.map((id) => ensureLazyForNode(nodeById(id))));
      const lines = [];
      for (const id of ids) {
        const n = nodeById(id);
        const sh = classSheetByNode(n);
        const list = listFromValue(sh?.data?.allFunctions?.length ? sh.data.allFunctions : sh?.data?.topFunctions);
        for (const f of list) {
          if (String(f.type || "").toLowerCase().includes("категор")) continue;
          const t = f.title || "—";
          lines.push({ line: `${n.label.replace(/\n/g, " ").trim()}: ${t}` });
        }
      }
      fwrap.innerHTML = lines
        .map(
          (x) =>
            `<label class="cfg-corr-cand"><input type="checkbox" class="cfg-wz-fn" data-wz-line="${esc(x.line)}" /><span>${esc(
              x.line
            )}</span></label>`
        )
        .join("");
    });
    document.getElementById("cfgWzAddToZone")?.addEventListener("click", () => {
      const picks = [...document.querySelectorAll("#cfgWzFns input.cfg-wz-fn:checked")]
        .map((x) => x.getAttribute("data-wz-line"))
        .filter(Boolean);
      const ta = document.querySelector("#cfgZonesHost .cfg-zone-text");
      if (!ta || !picks.length) return;
      const add = picks.join("\n");
      ta.value = ta.value.trim() ? `${ta.value.trim()}\n${add}` : add;
    });
    document.getElementById("cfgWzFnSearch")?.addEventListener("input", (ev) => {
      const q = String(ev.target.value || "").trim().toLowerCase();
      document.querySelectorAll("#cfgWzFns label.cfg-corr-cand").forEach((lab) => {
        const t = lab.textContent || "";
        lab.style.display = !q || t.toLowerCase().includes(q) ? "block" : "none";
      });
    });
  }

  function ensureDefaultFreeFuncLine() {
    const h = document.getElementById("cfgFreeFuncLines");
    if (!h || h.querySelector("input.cfg-free-func-line")) return;
    const i = document.createElement("input");
    i.type = "text";
    i.className = "search-input cfg-free-func-line";
    i.style.marginTop = "6px";
    i.placeholder = "Одна строка — одна ожидаемая функция";
    h.appendChild(i);
  }

  function initChips() {
    const chips = document.getElementById("cfgChips");
    if (!chips || chips.dataset.bound === "1") return;
    chips.dataset.bound = "1";
    const picks = ["инцидент", "лиценз", "CMDB", "SAM", "ITAM", "уязвим", "мониторинг", "изменения", "IAM", "DLP", "FinOps", "облако"];
    picks.forEach((label) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cfg-chip";
      b.textContent = label;
      b.addEventListener("click", () => {
        const target = getChipTargetTextarea();
        if (!target) return;
        const cur = target.value.trim();
        target.value = cur ? `${cur}, ${label}` : label;
        target.focus();
      });
      chips.appendChild(b);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initChips();
    renderVendorPick();
    renderVendorDetail();

    document.addEventListener("change", (ev) => {
      const el = ev.target;
      if (!(el instanceof HTMLInputElement)) return;
      if (el.classList.contains("cfg-corr-fn")) {
        const ti = parseInt(el.getAttribute("data-thesis-ix") || "-1", 10);
        let fk = el.getAttribute("data-func-key") || "";
        try {
          fk = decodeURIComponent(fk);
        } catch (_) {
          /* ignore */
        }
        if (ti < 0 || !fk) return;
        if (!corrState.thesisPicks.has(ti)) corrState.thesisPicks.set(ti, new Set());
        const set = corrState.thesisPicks.get(ti);
        if (el.checked) set.add(fk);
        else set.delete(fk);
        renderVendorDetail();
      }
    });

    document.addEventListener("click", (e) => {
      const mx = e.target.closest("button.cfg-mx-tog");
      if (mx && document.getElementById("cfgVendorDetail")?.contains(mx)) {
        CFG_MX_FILTER = mx.getAttribute("data-cfg-mx") === "query" ? "query" : "all";
        renderVendorDetail();
        return;
      }
      if (e.target.id === "cfgFinalizeFreeBundleBtn") {
        FREE_BUNDLE_STEP2 = true;
        requestAnimationFrame(() => {
          void runConfigurator("bundle");
        });
        return;
      }
      if (e.target.id === "cfgOpenProjectMapBtn") {
        openProjectMapFromConfigurator();
      }
    });

    const host = document.getElementById("cfgZonesHost");
    if (host && !host.dataset.inited) {
      host.dataset.inited = "1";
      host.innerHTML = "";
      addZoneRow("Операции и сервис (z-itsm)", "Инциденты, заявки, SLA, каталог, изменения…");
      addZoneRow("Данные и активы (z-disc / z-norm / z-cmdb)", "Discovery, CMDB, нормализация, реестр ПО…");
      addZoneRow("Безопасность (z-sec)", "SIEM, уязвимости, EDR, доступы…");
      addZoneRow("Финансы и лицензии (z-fin)", "SAM, entitlement, FinOps, аудит…");
    }

    document.getElementById("cfgAddZoneBtn")?.addEventListener("click", () => addZoneRow("Новая зона", "Опишите требования…"));
    function queueCfgRun(mode) {
      requestAnimationFrame(() => {
        void runConfigurator(mode);
      });
    }

    document.getElementById("cfgRunClassesBtn")?.addEventListener("click", () => queueCfgRun("classes"));
    document.getElementById("cfgRunBundleBtn")?.addEventListener("click", () => queueCfgRun("bundle"));
    ["cfgBundleRegion", "cfgBundleOss"].forEach((tid) => {
      document.getElementById(tid)?.addEventListener("change", () => {
        if (lastRunCtx?.outputKind === "bundle") queueCfgRun("bundle");
      });
    });

    document.querySelectorAll('input[name="cfgMode"]').forEach((r) => {
      r.addEventListener("change", () => {
        syncModeUi();
      });
    });
    syncModeUi();
    initZoneWizardUi();
    ensureDefaultFreeFuncLine();
    document.getElementById("cfgAddFreeFuncLine")?.addEventListener("click", () => {
      const h = document.getElementById("cfgFreeFuncLines");
      if (!h) return;
      const i = document.createElement("input");
      i.type = "text";
      i.className = "search-input cfg-free-func-line";
      i.style.marginTop = "6px";
      i.placeholder = "Функция / требование";
      h.appendChild(i);
    });
  });
})();
