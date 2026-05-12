/**
 * Один сводный CSV (UTF-8 с BOM) для Excel: справочник зон/классов + все листы функций.
 * Запуск из корня репозитория: node scripts/export-kb-master-for-excel.mjs
 * Выход: kb/ENTERPRISE_KB_MASTER_FOR_EXCEL.csv
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outPath = path.join(repoRoot, "kb", "ENTERPRISE_KB_MASTER_FOR_EXCEL.csv");

function readFileTextSmart(filePath) {
  const buf = fs.readFileSync(filePath);
  if (!buf.length) return "";
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString("utf8");
  }
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

function csvCell(v) {
  const s = String(v ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(cells) {
  return cells.map(csvCell).join(",");
}

const refFile = "IT_Architecture_Zones_Classes_Reference__1_Справочник.csv";
const refPath = path.join(repoRoot, refFile);
const refLines = readCSV(refPath, 5);

const outRows = [];

outRows.push(
  row([
    "SECTION",
    "SOURCE_FILE",
    "PRIMARY_KEY",
    "STR_1",
    "STR_2",
    "STR_3",
    "STR_4",
    "STR_5",
    "STR_6",
    "STR_7",
  ])
);

outRows.push(
  row([
    "__README__",
    refFile,
    "Колонки STR для REFERENCE_ZONE и REFERENCE_CLASS: STR_1=what, STR_2=techGoal, STR_3=businessGoal, STR_4=howWorks. Для FUNCTION_ROW: STR_1=type, STR_2=priority, STR_3=title, STR_4=general, STR_5=technical, STR_6=business. Правь текст в STR_*; PRIMARY_KEY и SECTION для справочника не меняй без согласования. Функции — PRIMARY_KEY = имя листа (как в имени CSV после номера). Исходники: корневой справочник + Enterprise_IT_Landscape_47_классов__*.csv. Полный корпус исследования: kb/research-corpus.txt (в этот CSV не включён). Перегенерация: node scripts/export-kb-master-for-excel.mjs",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ])
);

const zoneRows = [];
const classRows = [];
for (const p of refLines) {
  const key = p[0]?.trim();
  if (!key) continue;
  if (/^z-[a-z\-]+$/.test(key)) {
    zoneRows.push({ key, p });
  } else if (/^z-[a-z\-]+\s*\|\s*.+$/i.test(key)) {
    classRows.push({ key, p });
  }
}
zoneRows.sort((a, b) => a.key.localeCompare(b.key));
classRows.sort((a, b) => a.key.localeCompare(b.key));

for (const { key, p } of zoneRows) {
  outRows.push(
    row([
      "REFERENCE_ZONE",
      refFile,
      key,
      p[1] || "",
      p[2] || "",
      p[3] || "",
      p[4] || "",
      "",
      "",
      "",
    ])
  );
}
for (const { key, p } of classRows) {
  outRows.push(
    row([
      "REFERENCE_CLASS",
      refFile,
      key,
      p[1] || "",
      p[2] || "",
      p[3] || "",
      p[4] || "",
      "",
      "",
      "",
    ])
  );
}

const funcFiles = fs
  .readdirSync(repoRoot)
  .filter((f) => /^Enterprise_IT_Landscape_47_классов__\d+_/i.test(f) && f.endsWith(".csv"))
  .sort((a, b) => {
    const na = parseInt(a.match(/__(\d+)_/)?.[1] || "0", 10);
    const nb = parseInt(b.match(/__(\d+)_/)?.[1] || "0", 10);
    return na - nb || a.localeCompare(b);
  });

for (const fname of funcFiles) {
  const sheetKey = fname.replace(/^Enterprise_IT_Landscape_47_классов__\d+_/, "").replace(/\.csv$/i, "");
  const fpath = path.join(repoRoot, fname);
  const rows = readCSV(fpath, 6);
  for (const p of rows) {
    const title = (p[2] || "").trim();
    if (!title) continue;
    outRows.push(
      row([
        "FUNCTION_ROW",
        fname,
        sheetKey,
        (p[0] || "").trim(),
        String(parseInt(p[1], 10) || 0),
        title,
        p[3] || "",
        p[4] || "",
        p[5] || "",
        "",
      ])
    );
  }
}

const corpusPath = path.join(repoRoot, "kb", "research-corpus.txt");
let corpusNote = "kb/research-corpus.txt отсутствует";
if (fs.existsSync(corpusPath)) {
  const st = fs.statSync(corpusPath);
  corpusNote = `kb/research-corpus.txt; байт=${st.size}; в мастер-таблицу не встраивается (слишком большой для Excel)`;
}
outRows.push(row(["CORPUS_META", "kb/research-corpus.txt", corpusNote, "", "", "", "", "", "", ""]));

const body = "\ufeff" + outRows.join("\r\n") + "\r\n";
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, body, "utf8");
console.log("Wrote", outPath, "rows:", outRows.length);
