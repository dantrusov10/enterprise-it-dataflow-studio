/**
 * Конфигуратор: подбор классов решений по зонам требований.
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

  async function runConfigurator() {
    const statusEl = document.getElementById("cfgStatus");
    const resultsEl = document.getElementById("cfgResults");
    const globalTa = document.getElementById("cfgGlobalContext");
    if (!resultsEl) return;

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
      if (statusEl) statusEl.textContent = "Заполните хотя бы одну зону требований или общий контекст (слова от 3 букв).";
      resultsEl.innerHTML = "";
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

    if (statusEl) {
      statusEl.textContent = top.length
        ? `Показано классов: ${top.length}. Сортировка: сумма по зонам + общий контекст; при равенстве — покрытие зон.`
        : "Нет совпадений — смягчите или разнесите формулировки по зонам.";
    }

    if (!top.length) {
      resultsEl.innerHTML = `<p class="muted">Попробуйте тезаурус: ITSM, CMDB, лицензии, IAM, мониторинг, инциденты…</p>`;
      return;
    }

    resultsEl.innerHTML = top
      .map((row) => {
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

        const chips = row.perZone
          .filter((z) => !z.skipped)
          .map((z) => {
            const cls = z.score > 0 ? "cfg-chip-hit" : "cfg-chip-miss";
            return `<span class="cfg-zone-chip ${cls}" title="${esc(z.title)}">${esc(z.title)}: ${z.score}</span>`;
          })
          .join("");
        const globalLine =
          globalTokens.length > 0
            ? `<div class="cfg-global-line"><span class="cfg-zone-chip ${row.globalScore > 0 ? "cfg-chip-hit" : "cfg-chip-miss"}">Общий контекст: ${row.globalScore}</span></div>`
            : "";

        const covPct = Math.round((row.coverage || 0) * 100);
        const metaLine = `<div class="cfg-card-meta">Итого ${Math.round(row.total * 10) / 10} · зоны с совпадениями ${row.matchedActive}/${row.activeZoneCount || 0} (${covPct}%)</div>`;

        const mapHref = indexMapUrl(n.id, hl);
        const detailHref = classDetailUrl(n, row.sheetMeta);

        return `<article class="cfg-card" data-node-id="${esc(n.id)}">
  <div class="cfg-card-score">${Math.round(row.total * 10) / 10}</div>
  <h3 class="cfg-card-class">${esc(canonical)}</h3>
  <div class="cfg-card-sub muted">${subParts.join(" · ")}</div>
  ${metaLine}
  <div class="cfg-zone-chips">${chips}${globalLine}</div>
  <div class="cfg-card-actions">
    <a class="btn btn-primary" href="${esc(mapHref)}">На схеме + база</a>
    <a class="btn" href="${esc(detailHref)}">Лист функций</a>
  </div>
</article>`;
      })
      .join("");
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
        const first = document.querySelector(".cfg-zone-row .cfg-zone-text");
        if (!first) return;
        const cur = first.value.trim();
        first.value = cur ? `${cur}, ${label}` : label;
        first.focus();
      });
      chips.appendChild(b);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initChips();
    const host = document.getElementById("cfgZonesHost");
    if (host && !host.dataset.inited) {
      host.dataset.inited = "1";
      host.innerHTML = "";
      addZoneRow("Операции и сервис", "Например: инциденты, заявки, SLA, каталог услуг, изменения…");
      addZoneRow("Данные и активы", "CMDB, discovery, нормализация, реестр ПО, облачный инвентарь…");
      addZoneRow("Безопасность и риски", "уязвимости, SIEM, EDR, доступы, комплаенс…");
      addZoneRow("Финансы и лицензии", "SAM, entitlement, отчёты для аудита, FinOps…");
    }
    document.getElementById("cfgAddZoneBtn")?.addEventListener("click", () => addZoneRow("Новая зона", "Опишите требования…"));
    document.getElementById("cfgRunBtn")?.addEventListener("click", () => void runConfigurator());
  });
})();
