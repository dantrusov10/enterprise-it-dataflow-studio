/**
 * Выгрузка в один XLSX:
 * 1) Зона — класс (узел L1) — вендор — продукт — прямые связи — косвенные связи
 * 2) Класс — что это — тех. цель — бизнес-цель — как работает
 * 3) Класс (лист) — категория/функция — текст — приоритет (1/2/3)
 *
 * Запуск из корня репозитория: node scripts/export-architecture-map-xlsx.mjs [путь-к-xlsx]
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function readFileTextSmart(filePath) {
  const buf = fs.readFileSync(filePath);
  if (!buf.length) return "";
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.slice(3).toString("utf8");
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    try {
      return new TextDecoder("windows-1251").decode(buf);
    } catch {
      return buf.toString("utf8");
    }
  }
}

function parseCSVLine(line) {
  const out = [];
  let i = 0;
  let cur = "";
  let inQuotes = false;
  while (i < line.length) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }
    if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  out.push(cur);
  return out;
}

function readCSV(filePath, minCols = 1) {
  const raw = readFileTextSmart(filePath).replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  if (!lines.length) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length < minCols) continue;
    rows.push(parts);
  }
  return rows;
}

function extractStateFromIndexHtml(html) {
  const marker = "const state = ";
  const i = html.indexOf(marker);
  if (i < 0) throw new Error("const state = not found in index.html");
  let start = i + marker.length;
  while (start < html.length && /[\s\n\r]/.test(html[start])) start++;
  if (html[start] !== "{") throw new Error("expected { after const state =");
  let depth = 0;
  let j = start;
  for (; j < html.length; j++) {
    const c = html[j];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        j++;
        break;
      }
    }
  }
  const body = html.slice(start, j);
  return new Function(`return ${body}`)();
}

function loadEnterpriseKb() {
  const kbPath = path.join(repoRoot, "enterprise-it-dataflow-knowledge.js");
  const code = fs.readFileSync(kbPath, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox);
  const KB = sandbox.window.ENTERPRISE_KB;
  if (!KB?.zones || !KB.classReference) throw new Error("ENTERPRISE_KB not loaded");
  return KB;
}

function nrm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function prepSearch(s) {
  return nrm(String(s || "").replace(/ё/g, "е"));
}

const NODE_KB_CLASSREF_KEY = {
  "n-infra-1": "Network Management?NMS",
  "n-infra-2": "IPAM?DNS?DHCP",
  "n-infra-3": "NAC",
  "n-itsm-1": "ITSM Core",
  "n-itsm-2": "Service Desk",
  "n-itsm-3": "BPM?Workflow",
  "n-itsm-4": "Knowledge Base",
  "n-fin-1": "ITAM",
  "n-fin-2": "SAM",
  "n-fin-3": "FinOps",
  "n-sec-3": "Vulnerability Management",
  "n-ops-1": "Monitoring / Event"
};

const NODE_KB_SHEET_KEY = {
  "n-ops-1": "мониторинг",
  "n-sec-3": "Сканер уязвимости"
};

const NODE_VENDOR_CATALOG_EXTRA_KEYS = {
  "n-disc-1": ["Normalization Engine", "Reconciliation∕De-dup", "Software Recognition", "Ownership Enrichment"],
  "n-itsm-1": ["Incident Management", "Change Management", "Problem Management", "Service Catalog", "Release Management"],
  "n-sec-4": ["PAM", "DLP", "GRC"],
  "n-ops-3": ["Deployment∕SW Distribution", "Patch Management", "Configuration Management"],
  "n-fin-2": ["License Management"]
};

function zoneKbById(KB, zoneId) {
  return KB.zones?.[zoneId] || null;
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
  if (node.id === "n-sec-3") {
    out.add("Сканер уязвимости");
    out.add("Vulnerability Management");
  }
  if (node.id === "n-ops-1") {
    out.add("мониторинг");
  }
  return [...out].filter(Boolean);
}

function classRefByNode(KB, node) {
  if (!node) return null;
  if (node.hub && node.id === "n-hub") {
    const ref = KB.classReference?.["CMDB / Asset Data Hub"];
    if (ref) return { key: "CMDB / Golden Record", data: ref };
  }
  if (node.id === "n-disc-1") {
    const z = zoneKbById(KB, "z-disc");
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

function classSheetByNode(KB, node) {
  if (!node) return null;
  const sheets = KB.classSheets || {};
  const flat = nrm(node.label.replace(/\n/g, " "));
  const isDiscoveryInventoryLayer =
    node.id === "n-disc-1" ||
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

function catalogEntriesForKbNode(cat, ref, sheet, node) {
  if (!cat || typeof cat !== "object") return [];
  const rawKeys = [ref?.key, sheet?.key, node?.label?.replace(/\n/g, " ")].filter(Boolean);
  for (const tk of rawKeys) {
    if (cat[tk]?.length) return cat[tk];
    const t = prepSearch(tk);
    for (const k of Object.keys(cat)) {
      if (prepSearch(k) === t) return cat[k];
    }
  }
  const parts = String(node?.label || "")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const part of parts) {
    const t = prepSearch(part);
    for (const k of Object.keys(cat)) {
      if (prepSearch(k) === t) return cat[k];
    }
  }
  const label = prepSearch(node?.label?.replace(/\n/g, " ") || "");
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

function catalogEntriesMerged(cat, ref, sheet, node) {
  const primary = catalogEntriesForKbNode(cat, ref, sheet, node);
  const extras = NODE_VENDOR_CATALOG_EXTRA_KEYS[node?.id];
  if (!extras?.length || !cat) return primary;
  const seen = new Set(primary.map((e) => prepSearch(`${e.vendor || ""}|${e.product || ""}`)));
  const out = [...primary];
  for (const k of extras) {
    const arr = cat[k] || [];
    for (const e of arr) {
      const sk = prepSearch(`${e.vendor || ""}|${e.product || ""}`);
      if (seen.has(sk)) continue;
      seen.add(sk);
      out.push(e);
    }
  }
  return out;
}

function endpointTitle(state, id) {
  if (String(id).startsWith("z-")) {
    const z = state.zones.find((x) => x.id === id);
    return z ? z.title : id;
  }
  const n = state.nodes.find((x) => x.id === id);
  if (!n) return id;
  return String(n.label || "").replace(/\n/g, " / ").trim();
}

function linkSummaries(state, node) {
  const nid = node.id;
  const zid = node.zoneId;
  const direct = [];
  const indirect = [];
  for (const e of state.edges || []) {
    if (e.type === "direct") {
      if (e.from === nid || e.to === nid) {
        const other = e.from === nid ? e.to : e.from;
        direct.push(`${endpointTitle(state, other)} — ${e.label || ""}`);
      }
    } else if (e.type === "alt") {
      if (e.from === nid || e.to === nid) {
        const other = e.from === nid ? e.to : e.from;
        indirect.push(`[alt] ${endpointTitle(state, other)} — ${e.label || ""}`);
      }
    } else if (e.type === "zone") {
      if (e.from === zid || e.to === zid) {
        const a = endpointTitle(state, e.from);
        const b = endpointTitle(state, e.to);
        indirect.push(`[зона] ${a} → ${b}: ${e.label || ""}`);
      }
    }
  }
  return { direct: direct.join(" | "), indirect: indirect.join(" | ") };
}

function sheetNameFromFuncFilename(fname) {
  return fname.replace(/^Enterprise_IT_Landscape_47_классов__\d+_/, "").replace(/\.csv$/i, "");
}

function buildSheet3Rows() {
  const rows = [];
  const files = fs
    .readdirSync(repoRoot)
    .filter((f) => /^Enterprise_IT_Landscape_47_классов__\d+_/i.test(f) && f.endsWith(".csv") && !/легенда/i.test(f));
  for (const fname of files.sort()) {
    const className = sheetNameFromFuncFilename(fname);
    const data = readCSV(path.join(repoRoot, fname), 6);
    let lastCategory = "";
    for (const p of data) {
      const typ = (p[0] || "").trim().toLowerCase();
      const prio = String(parseInt(p[1], 10) || "").trim();
      const title = (p[2] || "").trim();
      const general = (p[3] || "").trim();
      const technical = (p[4] || "").trim();
      const business = (p[5] || "").trim();
      if (typ === "категория") {
        lastCategory = title;
        const text = [general, technical, business].filter(Boolean).join("\n\n");
        rows.push({
          className,
          category: title,
          functionTitle: "(категория)",
          priority: prio || "",
          fullText: text
        });
      } else if (typ === "функция") {
        const text = [general, technical, business].filter(Boolean).join("\n\n");
        rows.push({
          className,
          category: lastCategory || "",
          functionTitle: title,
          priority: prio || "",
          fullText: text
        });
      }
    }
  }
  return rows;
}

function main() {
  const outPath =
    process.argv[2] ||
    path.join(repoRoot, `Enterprise_IT_Architecture_Map_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);

  const indexHtml = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
  const state = extractStateFromIndexHtml(indexHtml);
  const KB = loadEnterpriseKb();
  const vendorsPath = path.join(repoRoot, "kb", "merged", "vendors-by-class.json");
  const vendors = JSON.parse(fs.readFileSync(vendorsPath, "utf8"));

  const zoneById = Object.fromEntries((state.zones || []).map((z) => [z.id, z]));

  const sheet1 = [];
  for (const node of state.nodes || []) {
    const zone = zoneById[node.zoneId];
    const zoneTitle = zone ? zone.title : node.zoneId;
    const classLabel = String(node.label || "").replace(/\n/g, " ").trim();
    const ref = classRefByNode(KB, node);
    const sheet = classSheetByNode(KB, node);
    const entries = catalogEntriesMerged(vendors, ref, sheet, node);
    const { direct, indirect } = linkSummaries(state, node);

    if (!entries.length) {
      sheet1.push({
        Зона: zoneTitle,
        Класс: classLabel,
        Вендор: "",
        Продукт: "",
        "Связи прямые": direct,
        "Связи косвенные": indirect
      });
      continue;
    }
    for (const e of entries) {
      sheet1.push({
        Зона: zoneTitle,
        Класс: classLabel,
        Вендор: e.vendor || "",
        Продукт: e.product || "",
        "Связи прямые": direct,
        "Связи косвенные": indirect
      });
    }
  }

  const sheet2Map = new Map();
  for (const node of state.nodes || []) {
    const classLabel = String(node.label || "").replace(/\n/g, " ").trim();
    const ref = classRefByNode(KB, node);
    const d = ref?.data;
    const key = ref?.key || classLabel;
    if (!sheet2Map.has(key)) {
      sheet2Map.set(key, {
        "ID узла": node.id,
        Класс: classLabel,
        kb_ключ: key,
        "Что это": d?.what || "",
        "Тех. цель": d?.techGoal || "",
        "Бизнес-цель": d?.businessGoal || "",
        "Как работает": d?.howWorks || ""
      });
    }
  }
  const sheet2 = [...sheet2Map.values()].sort((a, b) => String(a.kb_ключ).localeCompare(String(b.kb_ключ), "ru"));

  const sheet3 = buildSheet3Rows();

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(sheet1),
    "Карта зона-класс-вендор"
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2), "Справочник классов");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      sheet3.map((r) => ({
        Класс: r.className,
        Категория: r.category,
        Функции: `${r.functionTitle}\n\n${r.fullText}`.trim(),
        "Приоритет (1/2/3)": r.priority
      }))
    ),
    "Функции по классам"
  );

  XLSX.writeFile(wb, outPath);
  console.log("Wrote", outPath);
  console.log("Sheet1 rows:", sheet1.length, "Sheet2 rows:", sheet2.length, "Sheet3 rows:", sheet3.length);
}

main();
