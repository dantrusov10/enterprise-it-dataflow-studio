/**
 * Сборка enterprise-it-dataflow-knowledge.js из CSV в корне репозитория.
 * Запуск: node scripts/build-knowledge.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

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

function readCSV(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  if (!lines.length) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length < 6) continue;
    rows.push(parts);
  }
  return rows;
}

const refPath = path.join(
  repoRoot,
  "IT_Architecture_Zones_Classes_Reference__1_Справочник.csv"
);
const refLines = readCSV(refPath);
const zones = {};
const classReference = {};
for (const p of refLines) {
  const key = p[0]?.trim();
  if (!key) continue;
  if (/^z-[a-z\-]+$/.test(key)) {
    zones[key] = {
      id: key,
      what: p[1] || "",
      techGoal: p[2] || "",
      businessGoal: p[3] || "",
      howWorks: p[4] || "",
    };
  } else if (/^z-[a-z\-]+\s*\|\s*.+$/i.test(key)) {
    const [zid, cname] = key.split("|").map((s) => s.trim());
    classReference[cname] = {
      zoneId: zid,
      what: p[1] || "",
      techGoal: p[2] || "",
      businessGoal: p[3] || "",
      howWorks: p[4] || "",
    };
  }
}

const classSheets = {};
const funcFiles = fs
  .readdirSync(repoRoot)
  .filter((f) => /^Enterprise_IT_Landscape_47_классов__\d+_/i.test(f) && f.endsWith(".csv"));

for (const fname of funcFiles) {
  const sheet = fname.replace(/^Enterprise_IT_Landscape_47_классов__\d+_/, "").replace(/\.csv$/i, "");
  const rows = readCSV(path.join(repoRoot, fname));
  const funcs = [];
  for (const p of rows) {
    const typ = (p[0] || "").trim();
    const prio = parseInt(p[1], 10) || 0;
    const title = (p[2] || "").trim();
    if (!title) continue;
    funcs.push({
      type: typ,
      priority: prio,
      title,
      general: p[3] || "",
      technical: p[4] || "",
      business: p[5] || "",
    });
  }
  const top = [...funcs]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10);
  classSheets[sheet] = {
    sheet,
    functionCount: funcs.length,
    topFunctions: top,
    allFunctions: funcs,
  };
}

const payload = {
  generatedAt: new Date().toISOString().slice(0, 19),
  zones,
  classReference,
  classSheets,
};

const outPath = path.join(repoRoot, "enterprise-it-dataflow-knowledge.js");
const json = JSON.stringify(payload);
fs.writeFileSync(outPath, `window.ENTERPRISE_KB = ${json};`, "utf8");
console.log("Wrote", outPath, "sheets:", Object.keys(classSheets).length);
