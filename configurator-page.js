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

  const VENDOR_PROFILES = [
    {
      id: "v-itsm",
      name: "Условный стек ITSM / ESM",
      strong: "инцидент itsm change проблем релиз заявк ticket service каталог sla workflow bpm знания обращен дежурств major",
      weak: "sam лиценз entitlement siem edr уязвим grc finops"
    },
    {
      id: "v-fin",
      name: "Условный стек ITAM / SAM / финансы",
      strong: "sam лиценз itam актив entitlement авториз tco finops erp закуп списан капекс",
      weak: "siem edr dlp инцидент itsm уязвим"
    },
    {
      id: "v-sec",
      name: "Условный стек SecOps / GRC",
      strong: "siem soar уязвим vulnerab grc комплаенс edr pam dlp кибер soc форензик",
      weak: "itam sam itsm finops cmdb"
    },
    {
      id: "v-data",
      name: "Условный стек CMDB / Discovery / качество данных",
      strong: "cmdb ci golden дискавери discovery инвентар нормализ reconcil дедуп сопостав сигнатур recognition dataset",
      weak: "лиценз инцидент siem"
    },
    {
      id: "v-ops",
      name: "Условный стек облако / мониторинг / SRE",
      strong: "монитор observabil apm лог алерт cloud kubernetes k8s контейнер vpc s3 trace telemet sre событ correlat syslog",
      weak: "лиценз grc itsm"
    }
  ];

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

  async function buildBundleHtmlFromTopClasses(top, tokens) {
    try {
      const cat = await loadVendorsByClassCatalog();
      if (!cat || !Object.keys(cat).length) {
        return `<div class="cfg-subh">Подобранный бандл (продукты)</div><p class="muted">Нет данных каталога (<code>kb/merged/vendors-by-class.json</code>). Запустите <code>npm run merge-landscape</code> и откройте страницу с локального/деплой-сервера (не file://).</p>`;
      }
      const rows = [];
      for (const row of top.slice(0, 10)) {
        const entries = vendorCatalogEntriesForRow(row, cat);
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
          ? `По каждому классу из топа — до 3 продуктов из каталога с скорингом по вашему запросу. Зелёная рамка — лучший скор в строке.`
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
            return `<td><div class="cfg-bundle-pick${lead}"><span class="cfg-bundle-score">${pick.score}</span><b>${esc(pick.e.vendor)}</b> — ${esc(pick.e.product)}<div class="muted" style="font-size:10px;margin-top:4px;">${snippet}${tail}</div></div></td>`;
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

  function vendorThemeStatus(v, gi) {
    const SH = prepSearch(v.strong);
    const WH = prepSearch(v.weak);
    let hitS = false;
    let hitW = false;
    for (const k of THESAURUS_GROUPS[gi]) {
      const pk = prepSearch(k);
      if (pk.length < 3) continue;
      if (SH.includes(pk) || SH.includes(stemToken(pk))) hitS = true;
      if (WH.includes(pk) || WH.includes(stemToken(pk))) hitW = true;
    }
    if (hitS && !hitW) return "yes";
    if (hitW && !hitS) return "no";
    if (hitS && hitW) return "part";
    return "part";
  }

  function statusWeight(st) {
    if (st === "yes") return 1;
    if (st === "part") return 0.45;
    return 0;
  }

  function vendorCoveragePct(v, activeThemes) {
    if (!activeThemes.length) return 72;
    let sum = 0;
    for (const gi of activeThemes) sum += statusWeight(vendorThemeStatus(v, gi));
    return Math.min(100, Math.round((100 * sum) / activeThemes.length));
  }

  function statusLabelRu(st) {
    if (st === "yes") return { t: "Есть", c: "cfg-st-yes" };
    if (st === "part") return { t: "Частично", c: "cfg-st-part" };
    return { t: "Нет / слабо", c: "cfg-st-no" };
  }

  function selectedVendors() {
    return VENDOR_PROFILES.filter((v) => document.getElementById(`cfg-v-${v.id}`)?.checked);
  }

  function renderVendorDetail() {
    const host = document.getElementById("cfgVendorDetail");
    if (!host || !lastRunCtx) {
      if (host) host.innerHTML = `<p class="muted">Сначала выполните подбор — появятся темы требований и расчёт по вендорам.</p>`;
      return;
    }
    const picked = selectedVendors();
    const themes = lastRunCtx.activeThemeIndices;
    if (!picked.length) {
      host.innerHTML = `<p class="muted">Отметьте один или несколько вендоров портфеля — покажем матрицу «есть / нет» по темам из запроса.</p>`;
      return;
    }

    if (!themes.length) {
      host.innerHTML = `<p class="muted">По запросу не выделились темы из тезауруса — уточните формулировку (например: инциденты, CMDB, лицензии). Матрица вендоров появится, когда темы будут распознаны.</p>`;
      return;
    }

    const rows = themes.map((gi) => {
      const label = THEME_GROUP_LABELS[gi] || `Тема ${gi + 1}`;
      const cells = picked.map((v) => {
        const st = vendorThemeStatus(v, gi);
        const { t, c } = statusLabelRu(st);
        return `<td class="${c}">${esc(t)}</td>`;
      }).join("");
      return `<tr><th scope="row">${esc(label)}</th>${cells}</tr>`;
    });

    const head = `<tr><th scope="col">Тема из требований</th>${picked.map((v) => `<th scope="col">${esc(v.name)}</th>`).join("")}</tr>`;

    const pctBlocks = picked
      .map((v) => {
        const pct = vendorCoveragePct(v, themes);
        return `<div style="flex:1;min-width:120px;"><div class="muted" style="font-size:11px;">${esc(v.name)}</div><div class="cfg-pct">${pct}%</div><div class="muted" style="font-size:10px;">условное покрытие тем</div></div>`;
      })
      .join("");

    const composite = buildCompositePlan(picked, themes);

    host.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;">${pctBlocks}</div>
      <table class="cfg-vt" aria-label="Покрытие тем вендорами">
        <thead>${head}</thead>
        <tbody>${rows.join("")}</tbody>
      </table>
      <div class="cfg-composite"><b>Черновик комплексной конфигурации</b> (по соотношению тем; заменится оптимизатором по матрице функций):<br/>${esc(composite)}</div>
    `;
  }

  function buildCompositePlan(vendors, themes) {
    if (!themes.length) return "Уточните запрос — не выделены темы для сопоставления.";
    const parts = [];
    for (const gi of themes) {
      const label = THEME_GROUP_LABELS[gi] || `Тема ${gi + 1}`;
      let best = null;
      let bestW = -1;
      for (const v of vendors) {
        const w = statusWeight(vendorThemeStatus(v, gi));
        if (w > bestW) {
          bestW = w;
          best = v;
        }
      }
      if (best && bestW > 0) {
        parts.push(`${label}: опорный контур — «${best.name}»`);
      } else {
        parts.push(`${label}: нет уверенного покрытия среди выбранных вендоров — рассмотреть отдельный продукт или доработку.`);
      }
    }
    if (vendors.length > 1) {
      parts.push(`Интеграция: заложить шину обмена и единый каталог идентичностей между ${vendors.length} контурами.`);
    }
    return parts.join(". ");
  }

  function renderVendorPick() {
    const host = document.getElementById("cfgVendorPick");
    if (!host) return;
    host.innerHTML = VENDOR_PROFILES.map((v) => `
      <label><input type="checkbox" id="cfg-v-${esc(v.id)}" data-vendor-id="${esc(v.id)}" /> ${esc(v.name)}</label>
    `).join("");
    host.querySelectorAll("input[type=checkbox]").forEach((el) => {
      el.addEventListener("change", () => renderVendorDetail());
    });
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
    const globalTa = document.getElementById("cfgGlobalContext");
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
      renderVendorDetail();
      return;
    }

    if (statusEl) statusEl.textContent = "Загрузка листов классов и подбор…";
    resultsEl.innerHTML = "";

    const scored = [];
    for (const n of MAP.nodes) {
      await ensureLazyForNode(n);
      const item = buildNodeSearchItem(n);
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
      renderVendorDetail();
      return;
    }

    const cardsHtml = `<div class="cfg-subh">Классы решений</div>` + top.map((row) => buildClassCardHtml(row, hl, { mode: "zones" })).join("");
    if (outputKind === "bundle") {
      resultsEl.innerHTML = await buildBundleHtmlFromTopClasses(top, allToks);
    } else {
      resultsEl.innerHTML = cardsHtml;
    }

    lastRunCtx = {
      mode: "zones",
      outputKind,
      requirementSummary: hl,
      tokens: allToks,
      activeThemeIndices: activeThemeIndices(allToks),
      topClasses: top.slice(0, 8)
    };
    renderVendorDetail();
  }

  async function runModeFree(statusEl, resultsEl, outputKind) {
    const ta = document.getElementById("cfgFreeText");
    const raw = String(ta?.value || "").trim();
    const rawToks = tokenizeQuery(raw);
    const tokens = expandQueryTokens(rawToks);

    if (!tokens.length) {
      if (statusEl) statusEl.textContent = "Введите абзац скоупа (слова от 2 букв; лучше 3+ для устойчивости).";
      resultsEl.innerHTML = "";
      lastRunCtx = null;
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
      await ensureLazyForNode(n);
      const item = buildNodeSearchItem(n);
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
    const hl = mergeHighlightQuery([raw]);

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
      lastRunCtx = {
        mode: "free",
        outputKind,
        requirementSummary: hl,
        tokens,
        activeThemeIndices: activeThemeIndices(tokens),
        topClasses: []
      };
      renderVendorDetail();
      return;
    }

    const cardsHtml =
      zoneBlock +
      `<div class="cfg-subh">Классы решений</div>` +
      top.map((row) => buildClassCardHtml(row, hl, { mode: "free" })).join("");
    if (outputKind === "bundle") {
      resultsEl.innerHTML = await buildBundleHtmlFromTopClasses(top, tokens);
    } else {
      resultsEl.innerHTML = cardsHtml;
    }

    lastRunCtx = {
      mode: "free",
      outputKind,
      requirementSummary: hl,
      tokens,
      activeThemeIndices: activeThemeIndices(tokens),
      topClasses: top.slice(0, 8)
    };
    renderVendorDetail();
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
    setCfgLoading(true, kind === "bundle" ? "Подбор бандла…" : "Подбор классов…");
    resultsEl.innerHTML = "";
    try {
      if (isFreeMode()) await runModeFree(statusEl, resultsEl, kind);
      else await runModeZones(statusEl, resultsEl, kind);
    } catch (e) {
      console.error(e);
      if (statusEl) statusEl.textContent = "Ошибка подбора — см. консоль браузера.";
      resultsEl.innerHTML = `<p class="muted">Сбой выполнения. Убедитесь, что страница открыта через http(s), а не file://.</p>`;
    } finally {
      setCfgLoading(false, "Подбор…");
    }
  }

  function syncModeUi() {
    const zonesBlock = document.getElementById("cfgBlockZones");
    const freeBlock = document.getElementById("cfgBlockFree");
    if (!zonesBlock || !freeBlock) return;
    if (isFreeMode()) {
      zonesBlock.classList.add("cfg-hidden");
      freeBlock.classList.remove("cfg-hidden");
    } else {
      zonesBlock.classList.remove("cfg-hidden");
      freeBlock.classList.add("cfg-hidden");
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
    document.getElementById("cfgRunClassesBtn")?.addEventListener("click", () => void runConfigurator("classes"));
    document.getElementById("cfgRunBundleBtn")?.addEventListener("click", () => void runConfigurator("bundle"));

    document.querySelectorAll('input[name="cfgMode"]').forEach((r) => {
      r.addEventListener("change", () => {
        syncModeUi();
      });
    });
    syncModeUi();
  });
})();
