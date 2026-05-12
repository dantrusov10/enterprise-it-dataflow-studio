/**
 * Одноразово: дописать строки в IT_Architecture…csv в UTF-8 с BOM (как ожидает сборка).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const refPath = path.join(root, "IT_Architecture_Zones_Classes_Reference__1_Справочник.csv");

const buf = fs.readFileSync(refPath);
let text;
if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
  text = buf.slice(3).toString("utf8");
} else {
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    text = new TextDecoder("windows-1251").decode(buf);
  }
}

const newRows = [
  `z-itsm | Service Desk,"Единая точка контакта пользователей с ИТ: приём и первичная обработка обращений (инциденты, запросы на обслуживание, вопросы), мультиканальность и маршрутизация на L1/L2.","Стандартизировать регистрацию обращений, связать тикеты с CMDB и каталогом услуг, обеспечить SLA и эскалации.",Снижение времени восстановления сервиса и повышение удовлетворённости пользователей.,"Интеграции с ITSM Core, CMDB, Knowledge Base, телефонией и почтой; правила маршрутизации и очереди исполнителей."`,
  `z-fin | ITAM,"IT Asset Management: жизненный цикл IT-активов (закупка, ввод, эксплуатация, списание), кастодиан и финансовые атрибуты.","Единый учёт активов для планирования, аудита и согласованности с CMDB и финансами.",Прозрачность затрат и рисков по активам; поддержка compliance и отчётности.,"Интеграции с CMDB, procurement, SAM, ERP; workflow смены статусов и владельцев."`,
  `z-fin | SAM,"Software Asset Management: инвентаризация ПО, нормализация названий, сопоставление с лицензиями и контрактами.",Снижение license gap и подготовка к аудитам ПО.,Контроль стоимости и правового соответствия по ПО.,"Данные с агентов и реестров, связь с License Management и CMDB; отчёты ELP и рекомендации по оптимизации."`,
  `z-sec | Vulnerability Management,"Управление уязвимостями: обнаружение (сканирование, агенты), приоритизация, план ремедиации и контроль закрытия.",Сокращение окна эксплуатации уязвимостей и поверхности атаки.,Снижение риска инцидентов и требований регуляторов.,"Интеграция со сканерами, CMDB, patch- и ITSM-процессами; SLA на устранение и отчётность для CISO."`,
  `z-ops | Monitoring / Event,"Сбор метрик, событий и логов с инфраструктуры и приложений; алертинг, корреляция и передача сигналов в ITSM.",Раннее обнаружение отказов и деградаций; автоматизация создания инцидентов.,Минимизация MTTR и влияния сбоев на бизнес.,"Агенты, SNMP, API облаков и APM; правила алертов, webhooks в Service Desk/Incident Management, хранение временных рядов."`,
];

const keysToAdd = new Set(newRows.map((r) => r.split(",")[0].trim()));
const lines = text.split(/\r?\n/).filter((l) => l.length);
const filtered = lines.filter((l) => {
  const k = l.split(",")[0]?.trim();
  return !keysToAdd.has(k);
});
const out = "\ufeff" + filtered.join("\n").trimEnd() + "\n" + newRows.join("\n") + "\n";
fs.writeFileSync(refPath, out, "utf8");
console.log("Appended", newRows.length, "rows to", path.basename(refPath));
