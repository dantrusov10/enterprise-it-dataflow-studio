/**
 * Метаданные и фильтры для записей каталога kb/merged/vendors-by-class.json.
 * Поля region / openSource могут приходить из Excel (merge-landscape); иначе — эвристика по тексту.
 */
(function (g) {
  const RF_VENDOR_SUB = [
    "10-strike",
    "astra linux",
    "positive technologies",
    "infotecs",
    "infowatch",
    "kaspersky",
    "криптон",
    "колибри",
    "r7-",
    "r7 ",
    "r7 офис",
    "росатом",
    "rostelecom",
    "ростелеком",
    "softline",
    "softline ",
    "ibs ",
    "ibs-",
    "naumen",
    "lanit",
    "tensor",
    "сбис",
    "контур",
    "infosec",
    "security code",
    "актив ",
    "basealt",
    "red soft",
    "ред софт",
    "газинформ",
    "газпром",
    "rostele",
    "themisoft",
    "themiso",
    "рутокен",
    "crypto-pro",
    "крипто-про",
    "infosecurity",
    "jet infosystems",
    "jet info",
    "1c-",
    "1с-",
    "1c ",
    "1с "
  ];

  const GLOBAL_VENDOR_SUB = [
    "microsoft",
    "amazon",
    "aws ",
    "google",
    "oracle",
    "sap ",
    "salesforce",
    "servicenow",
    "ibm ",
    "cisco",
    "vmware",
    "broadcom",
    "palo alto",
    "splunk",
    "dynatrace",
    "datadog",
    "atlassian",
    "hashicorp",
    "snowflake",
    "dell ",
    "hp ",
    "hpe ",
    "red hat",
    "canonical",
    "suse ",
    "nutanix",
    "crowdstrike",
    "okta",
    "zscaler",
    "flexera",
    "bmc ",
    "axway",
    "micro focus",
    "opentext",
    "quest software",
    "manageengine",
    "solarwinds",
    "lansweeper",
    "qualys",
    "rapid7",
    "tenable",
    "wiz",
    "lacework"
  ];

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseHintRegion(raw) {
    const t = norm(raw);
    if (!t) return null;
    if (/мульти|multi|глоб|international|worldwide|eu\s*\/\s*us|сша\s*\/\s*eu|снг\s*\+\s*eu/.test(t)) return "multi";
    if (/^(rf|ru|росс|рф)\b|российск|отечествен|импортозамещ|152|фстэк|екатт|минцифр/.test(t)) return "rf";
    if (/^(us|eu|uk|emea|global|зарубеж|international|non-ru|non ru|foreign)\b|только\s*не\s*рф|вне\s*рф/.test(t)) return "non_rf";
    return null;
  }

  function parseHintOss(raw) {
    const t = norm(raw);
    if (!t) return null;
    if (/мульти|dual|dual-?licen|commercial\s*\+\s*oss|hybrid/.test(t)) return "multi";
    if (/open\s*source|опенсорс|gpl|mit\s*licen|apache\s*licen|free\s*software|foss|github\.com\/|gitlab|community\s*edition|\bce\b/.test(t))
      return "yes";
    if (/proprietary|закрыт|коммерческ|commercial|subscription|perpetual|enterprise\s*licen|saas\b/.test(t)) return "no";
    return null;
  }

  function inferRegion(entry) {
    const fromCol = parseHintRegion(entry.region || entry.regionHint || entry["Регион"]);
    if (fromCol) return fromCol;
    const v = norm(entry.vendor);
    const p = norm(entry.product);
    const d = norm((entry.description || "").slice(0, 500));
    const blob = `${v} ${p} ${d}`;
    if (/росси|рф\b|отечествен|импортозамещ|152-фз|фстэк|минцифр|реестр\s*отечествен|российск/.test(blob)) return "rf";
    let rfHit = RF_VENDOR_SUB.some((s) => v.includes(s) || p.includes(s));
    let glHit = GLOBAL_VENDOR_SUB.some((s) => v.includes(s) || p.startsWith(s.trim()));
    if (rfHit && glHit) return "multi";
    if (rfHit) return "rf";
    if (glHit) return "non_rf";
    if (/^[а-яё0-9 .,&\-]{3,}$/i.test(entry.vendor) && !/[a-z]{4,}/i.test(entry.vendor)) return "rf";
    return "multi";
  }

  function inferOss(entry) {
    const fromCol = parseHintOss(entry.openSource || entry.openSourceHint || entry["Open source"] || entry["Опенсорс"]);
    if (fromCol) return fromCol;
    const blob = norm(`${entry.vendor} ${entry.product} ${entry.description || ""} ${entry.topFunctions || ""}`);
    if (/apache software|mozilla|linux foundation|eclipse foundation|gnu gpl|agpl|open\s*source|free\s*software|foss|\bmit\b|\bgpl\b/.test(blob))
      return "yes";
    if (/\bapache\b|\bnginx\b|\bkubernetes\b|\bpostgres(ql)?\b|\bgitlab\b|\bgrafana\b|\bprometheus\b/.test(blob) && !/enterprise edition|commercial|cloud\s*\(paid\)/.test(blob))
      return "yes";
    if (/subscription|per seat|enterprise agreement|commercial|закрыт|проприетар|лицензиат|saas\b/.test(blob)) return "no";
    if (/open-?source|source\s*available|dual license/.test(blob)) return "multi";
    return "no";
  }

  function passesDim(entry, dim) {
    const r = inferRegion(entry);
    const o = inferOss(entry);
    const fr = dim?.region || "all";
    const fo = dim?.oss || "all";
    if (fr !== "all" && r !== fr) return false;
    if (fo !== "all" && o !== fo) return false;
    return true;
  }

  function filterEntries(entries, dim) {
    if (!entries?.length) return [];
    return entries.filter((e) => passesDim(e, dim));
  }

  g.VENDOR_CATALOG_META = {
    inferRegion,
    inferOss,
    passesDim,
    filterEntries
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
