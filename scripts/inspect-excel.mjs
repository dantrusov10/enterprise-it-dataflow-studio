/**
 * Быстрый просмотр структуры xlsx: имена листов + первые строки.
 * node scripts/inspect-excel.mjs [файл.xlsx]
 */
import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaults = [
  path.join(process.env.USERPROFILE || "", "Downloads", "актуальная_версия.xlsx"),
  path.join(process.env.USERPROFILE || "", "Downloads", "IT_Landscape_Вендоры_Классы.xlsx"),
  path.join(process.env.USERPROFILE || "", "Downloads", "Enterprise_IT_Landscape_47_классов.xlsx")
];

const files = process.argv.slice(2).length ? process.argv.slice(2) : defaults;

function peek(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log("MISSING:", filePath);
    return;
  }
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  console.log("\n===", filePath, "===");
  console.log("Sheets:", wb.SheetNames.length, wb.SheetNames.slice(0, 20).join(" | "), wb.SheetNames.length > 20 ? "…" : "");
  for (const name of wb.SheetNames.slice(0, 8)) {
    const sh = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: "" });
    const head = rows.slice(0, 4).map((r) => JSON.stringify(r).slice(0, 200));
    console.log("  --", name, "rows~", rows.length);
    head.forEach((h, i) => console.log("    ", i + 1, h));
  }
  if (wb.SheetNames.length > 8) console.log("  …", wb.SheetNames.length - 8, "more sheets");
}

for (const f of files) peek(path.isAbsolute(f) ? f : path.join(root, f));
