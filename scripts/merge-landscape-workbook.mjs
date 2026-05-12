/**
 * Объединяет три Excel-источника в один мастер-файл:
 *  - Enterprise_IT_Landscape_47_классов.xlsx — эталонные строки функций/категорий по классу (6 колонок)
 *  - актуальная_версия.xlsx — матрица да/нет/частично по продуктам для 8 дисциплин (совпадающих с Enterprise)
 *  - IT_Landscape_Вендоры_Классы.xlsx — полный каталог продуктов по классу (лист «Все вендоры»)
 *
 * Результат: папка kb/merged/
 *   - Enterprise_IT_Landscape_merged.xlsx  (1 лист = 1 класс; колонки = 6 + все продукты)
 *   - vendors-by-class.json               (для UI / конфигуратора)
 *   - MERGE_README.txt
 *
 * Запуск (пути по умолчанию — Downloads пользователя):
 *   npm run merge-landscape
 *
 * Свои пути:
 *   node scripts/merge-landscape-workbook.mjs --actual "..." --vendors "..." --enterprise "..." --out "..."
 */
import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function argVal(name, def) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}

const dl = path.join(process.env.USERPROFILE || "", "Downloads");
const PATH_ACTUAL = argVal("--actual", path.join(dl, "актуальная_версия.xlsx"));
const PATH_VENDORS = argVal("--vendors", path.join(dl, "IT_Landscape_Вендоры_Классы.xlsx"));
const PATH_ENTERPRISE = argVal("--enterprise", path.join(dl, "Enterprise_IT_Landscape_47_классов.xlsx"));
const OUT_DIR = argVal("--out", path.join(root, "kb", "merged"));

/** Пары [лист в актуальной_версии, лист в Enterprise] — одинаковая таксономия строк (Параметры). */
const MATRIX_SHEET_PAIRS = [
  ["Дискаверинг", "дискаверинг"],
  ["Мониторинг", "мониторинг"],
  ["ITSM", "ITSM"],
  ["SAM", "SAM"],
  ["ITAM", "ITAM"],
  ["Service Desk", "Service Desk"],
  ["Сканер уязвимостей", "Сканер уязвимости"],
  ["CMDB", "CMDB"]
];

function canon(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/∕/g, "/")
    .replace(/\s+/g, " ")
    .replace(/ё/g, "е")
    .trim();
}

function pickCol(row, aliases) {
  for (const name of aliases) {
    if (row[name] != null && String(row[name]).trim()) return String(row[name]).trim();
  }
  return "";
}

function classMatch(sheetName, vendorClass) {
  const a = canon(sheetName);
  const b = canon(vendorClass);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.replace(/ /g, "") === b.replace(/ /g, "")) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if (a.includes("cmdb") && b.includes("cmdb") && !b.includes("itsm core")) return true;
  if ((a.includes("monitor") || a.includes("монитор")) && (b.includes("monitor") || b.includes("монитор"))) return true;
  if (
    (a.includes("дискавер") || a === "inventory" || a.includes("inventory")) &&
    (b.includes("discovery") || b.includes("inventory"))
  ) {
    return true;
  }
  if (
    (a.includes("сканер") || a.includes("уязвим") || a.includes("vulner")) &&
    (b.includes("vulner") || b.includes("scan") || b.includes("сканер") || b.includes("уязвим"))
  ) {
    return true;
  }
  return false;
}

function sanitizeSheetName(name) {
  let s = String(name).replace(/[\\/*?:\[\]]/g, " ").replace(/\s+/g, " ").trim();
  if (s.length > 31) s = s.slice(0, 31).trim();
  if (!s) s = "Sheet";
  return s;
}

function enterpriseSheetForActual(actualName) {
  const p = MATRIX_SHEET_PAIRS.find(([a]) => a === actualName);
  return p ? p[1] : null;
}

function actualSheetForEnterprise(entName) {
  const p = MATRIX_SHEET_PAIRS.find(([, e]) => e === entName);
  return p ? p[0] : null;
}

function readMatrix(wb, sheetName) {
  const sh = wb.Sheets[sheetName];
  if (!sh) return null;
  return XLSX.utils.sheet_to_json(sh, { header: 1, defval: "" });
}

function buildParamToRow(matrixRows) {
  const map = new Map();
  for (let i = 1; i < matrixRows.length; i++) {
    const row = matrixRows[i];
    const typ = String(row[0] || "").toLowerCase();
    if (!typ.includes("категор") && !typ.includes("функц")) continue;
    const key = String(row[2] || "").trim();
    if (!key) continue;
    map.set(key, row);
  }
  return map;
}

function main() {
  for (const p of [PATH_ACTUAL, PATH_VENDORS, PATH_ENTERPRISE]) {
    if (!fs.existsSync(p)) {
      console.error("Файл не найден:", p);
      process.exit(1);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const wbActual = XLSX.read(fs.readFileSync(PATH_ACTUAL), { type: "buffer", cellDates: true });
  const wbVendors = XLSX.read(fs.readFileSync(PATH_VENDORS), { type: "buffer", cellDates: true });
  const wbEnt = XLSX.read(fs.readFileSync(PATH_ENTERPRISE), { type: "buffer", cellDates: true });

  const vendorRows = XLSX.utils.sheet_to_json(wbVendors.Sheets["Все вендоры"]);
  const vendorsByClass = {};

  for (const r of vendorRows) {
    const cls = String(r["Класс"] || "").trim();
    if (!cls) continue;
    if (!vendorsByClass[cls]) vendorsByClass[cls] = [];
    vendorsByClass[cls].push({
      zoneCode: r["Зона (код)"] || "",
      zoneTitle: r["Зона (название)"] || "",
      vendor: r["Вендор"] || "",
      product: r["Продукт"] || "",
      indirect: r["Косвенные классы"] || "",
      description: r["Описание"] || "",
      topFunctions: r["Топ функций"] || "",
      region: pickCol(r, ["Регион", "Region", "Страна/регион", "Регион поставки", "География"]),
      openSource: pickCol(r, ["Open source", "Опенсорс", "OSS", "Лицензия", "Тип лицензии", "Модель лицензии"])
    });
  }

  const actualCaches = new Map();
  for (const [actualSheet] of MATRIX_SHEET_PAIRS) {
    const rows = readMatrix(wbActual, actualSheet);
    if (!rows?.length) continue;
    const headers = rows[0].map((c) => String(c).trim());
    const products = headers.slice(6);
    const paramToRow = buildParamToRow(rows);
    actualCaches.set(actualSheet, { rows, headers, products, paramToRow });
  }

  const outWb = XLSX.utils.book_new();
  const usedNames = new Set();

  const enterpriseSheets = wbEnt.SheetNames.filter((n) => !String(n).toLowerCase().includes("легенда"));

  for (const entSheet of enterpriseSheets) {
    const sh = wbEnt.Sheets[entSheet];
    if (!sh) continue;
    const entRows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: "" });
    if (!entRows.length) continue;

    const actualName = actualSheetForEnterprise(entSheet);
    const cache = actualName ? actualCaches.get(actualName) : null;

    const vendorProducts = [];
    const seen = new Set();
    for (const r of vendorRows) {
      if (!classMatch(entSheet, r["Класс"])) continue;
      const v = String(r["Вендор"] || "").trim();
      const p = String(r["Продукт"] || "").trim();
      const label = `${v} — ${p}`.trim();
      if (!label || label === "—") continue;
      if (seen.has(canon(label))) continue;
      seen.add(canon(label));
      vendorProducts.push(label);
    }
    vendorProducts.sort((a, b) => a.localeCompare(b, "ru"));

    const actualProducts = cache ? [...cache.products] : [];
    const mergedProducts = [];
    const seenP = new Set();
    for (const p of [...actualProducts, ...vendorProducts]) {
      const k = canon(p);
      if (!k || seenP.has(k)) continue;
      seenP.add(k);
      mergedProducts.push(p);
    }

    const header = [...entRows[0].slice(0, 6), ...mergedProducts];
    const outRows = [header];

    const paramToActualRow = cache?.paramToRow;
    const actualHeader = cache?.headers || [];
    const productToIdx = new Map();
    actualHeader.forEach((h, i) => {
      if (i >= 6) productToIdx.set(canon(String(h)), i);
    });

    for (let i = 1; i < entRows.length; i++) {
      const er = entRows[i];
      const typ = String(er[0] || "").toLowerCase();
      if (!typ.includes("категор") && !typ.includes("функц")) continue;
      const param = String(er[2] || "").trim();
      const base = [...er.slice(0, 6)];
      while (base.length < 6) base.push("");
      const ar = paramToActualRow?.get(param);
      const tail = mergedProducts.map((prodLabel) => {
        if (!ar) return "";
        const idx = productToIdx.get(canon(prodLabel));
        if (idx == null) return "";
        return ar[idx] != null && ar[idx] !== "" ? ar[idx] : "";
      });
      outRows.push([...base, ...tail]);
    }

    let sheetName = sanitizeSheetName(entSheet);
    if (usedNames.has(sheetName)) {
      let k = 2;
      while (usedNames.has(`${sheetName.slice(0, 28)}_${k}`)) k++;
      sheetName = `${sheetName.slice(0, 28)}_${k}`;
    }
    usedNames.add(sheetName);
    const outSh = XLSX.utils.aoa_to_sheet(outRows);
    XLSX.utils.book_append_sheet(outWb, outSh, sheetName);
  }

  const readme = [
    "Enterprise IT Landscape — объединённая матрица",
    `Сгенерировано: ${new Date().toISOString()}`,
    "",
    "Источники:",
    `- Функции/категории: ${PATH_ENTERPRISE}`,
    `- Оценки продуктов (да/нет/частично): ${PATH_ACTUAL} — только листы, совпадающие с Enterprise по строкам «Параметры»`,
    `- Каталог продуктов: ${PATH_VENDORS} (лист «Все вендоры»)`,
    "",
    "Структура листа класса:",
    "- Колонки A–F: тип, балл, Параметры, Общая/Техн/Бизнес часть (как в Enterprise).",
    "- Далее: объединённый список продуктов (сначала из актуальной матрицы, затем недостающие из каталога вендоров).",
    "- Ячейки оценок копируются только при точном совпадении текста в «Параметры» между Enterprise и актуальной матрицей.",
    "",
    "Листы без полной матрицы в актуальной версии: колонки продуктов из каталога есть, ячейки оценок пустые до ручного/импортного заполнения."
  ].join("\n");

  fs.writeFileSync(path.join(OUT_DIR, "MERGE_README.txt"), readme, "utf8");

  const outXlsx = path.join(OUT_DIR, "Enterprise_IT_Landscape_merged.xlsx");
  XLSX.writeFile(outWb, outXlsx);

  const byEntSheet = {};
  for (const entSheet of enterpriseSheets) {
    const list = [];
    for (const r of vendorRows) {
      if (!classMatch(entSheet, r["Класс"])) continue;
      list.push({
        vendor: r["Вендор"] || "",
        product: r["Продукт"] || "",
        zoneCode: r["Зона (код)"] || "",
        zoneTitle: r["Зона (название)"] || "",
        description: r["Описание"] || "",
        topFunctions: r["Топ функций"] || "",
        region: pickCol(r, ["Регион", "Region", "Страна/регион", "Регион поставки", "География"]),
        openSource: pickCol(r, ["Open source", "Опенсорс", "OSS", "Лицензия", "Тип лицензии", "Модель лицензии"])
      });
    }
    byEntSheet[entSheet] = list;
  }
  fs.writeFileSync(path.join(OUT_DIR, "vendors-by-class.json"), JSON.stringify(byEntSheet, null, 2), "utf8");

  console.log("OK:", outXlsx);
  console.log("JSON:", path.join(OUT_DIR, "vendors-by-class.json"));
  console.log("Sheets:", outWb.SheetNames.length);
}

main();
