/**
 * Минимальные smoke-тесты без браузера: сборка KB, парс JS, валидация JSON листов.
 * Запуск: node scripts/smoke.mjs
 */
import fs from "fs";
import vm from "vm";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

execSync("node scripts/build-knowledge.mjs", { cwd: root, stdio: "inherit" });

const kbPath = path.join(root, "enterprise-it-dataflow-knowledge.js");
const kbSrc = fs.readFileSync(kbPath, "utf8");
const win = { console };
win.window = win;
vm.createContext(win);
vm.runInContext(kbSrc, win);
const kb = win.ENTERPRISE_KB;
if (!kb || typeof kb !== "object") throw new Error("ENTERPRISE_KB missing");
if (!kb.zones || typeof kb.zones !== "object") throw new Error("KB.zones missing");
if (!kb.classSheets || typeof kb.classSheets !== "object") throw new Error("KB.classSheets missing");

const sheetKeys = Object.keys(kb.classSheets);
if (sheetKeys.length < 40) throw new Error(`Expected many class sheets, got ${sheetKeys.length}`);

const sheetsDir = path.join(root, "kb", "sheets");
if (!fs.existsSync(sheetsDir)) throw new Error("kb/sheets directory missing");
let jsonCount = 0;
for (const key of sheetKeys) {
  const meta = kb.classSheets[key];
  if (!meta.lazySheet) throw new Error(`Sheet "${key}" missing lazySheet`);
  const fp = path.join(sheetsDir, meta.lazySheet);
  if (!fs.existsSync(fp)) throw new Error(`Missing lazy file ${meta.lazySheet}`);
  const data = JSON.parse(fs.readFileSync(fp, "utf8"));
  if ((data.functionCount || 0) > 0 && (!Array.isArray(data.allFunctions) || data.allFunctions.length === 0)) {
    throw new Error(`Invalid allFunctions in ${meta.lazySheet}`);
  }
  jsonCount++;
}
console.log("lazy sheet JSON files OK:", jsonCount);

const corpusPath = path.join(root, "kb", "research-corpus.txt");
if (!fs.existsSync(corpusPath)) throw new Error("kb/research-corpus.txt missing");
if (fs.readFileSync(corpusPath, "utf8").length < 1000) throw new Error("research corpus too small");

const indexPath = path.join(root, "index.html");
const indexHtml = fs.readFileSync(indexPath, "utf8");
const scripts = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const mainScript = scripts[scripts.length - 1];
try {
  new Function(mainScript);
} catch (e) {
  throw new Error(`index.html inline script syntax: ${e.message}`);
}
console.log("index.html inline script: syntax OK");

const cfgPagePath = path.join(root, "configurator-page.js");
const cfgPageSrc = fs.readFileSync(cfgPagePath, "utf8");
try {
  new Function(cfgPageSrc);
} catch (e) {
  throw new Error(`configurator-page.js syntax: ${e.message}`);
}
console.log("configurator-page.js: syntax OK");

if (!indexHtml.includes("knowledge-dock")) throw new Error("index.html missing knowledge-dock");
if (!indexHtml.includes("visibleZoneFilterSet")) throw new Error("index.html missing view filters");
if (!indexHtml.includes("configurator.html")) throw new Error("index.html missing link to configurator page");
if (!indexHtml.includes("handleConfiguratorOpenQuery")) throw new Error("index.html missing deep-link handler");

const cfgHtmlPath = path.join(root, "configurator.html");
const cfgHtml = fs.readFileSync(cfgHtmlPath, "utf8");
if (!cfgHtml.includes('name="cfgMode"')) throw new Error("configurator.html missing mode radios");
if (!cfgHtml.includes("cfgVendorPanel")) throw new Error("configurator.html missing vendor panel");
if (!cfgHtml.includes("cfgRunBundleBtn")) throw new Error("configurator.html missing bundle button");

console.log("smoke: all checks passed");
