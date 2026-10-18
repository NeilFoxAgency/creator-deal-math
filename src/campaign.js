/**
 * Multi-creator campaign rollup. Offline only. No I/O.
 *
 * Operators paste a small roster (handle, expected views, quoted fee,
 * niche, format) and get slate totals. Planning helper, not a rate card.
 */

"use strict";

const MAX_ROWS = 40;
const CONCENTRATION_WARN = 0.45;

function csvSafe(cell) {
  let s = String(cell == null ? "" : cell);
  if (/^[=+\-@\t\r\n]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function detectDelimiter(headerLine) {
  if (headerLine.indexOf("\t") !== -1) return "\t";
  return ",";
}

function splitLine(line, delimiter) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

function normalizeHeader(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

const HEADER_ALIASES = {
  handle: "handle",
  creator: "handle",
  channel: "handle",
  name: "handle",
  expected_views: "expectedViews",
  views: "expectedViews",
  expectedviews: "expectedViews",
  quoted_fee: "quotedFee",
  fee: "quotedFee",
  quote: "quotedFee",
  quotedfee: "quotedFee",
  niche: "niche",
  format: "format",
  usage: "usage",
  exclusivity: "exclusivity",
  extra_placements: "extraPlacements",
};

function parseRoster(text) {
  const errors = [];
  if (text == null || String(text).trim() === "") {
    return { ok: false, errors: ["Roster is empty."], rows: [] };
  }
  const lines = String(text)
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(function (line) {
      return line.trim() !== "";
    });
  if (lines.length < 2) {
    return { ok: false, errors: ["Roster needs a header row and at least one creator."], rows: [] };
  }
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter).map(normalizeHeader);
  const mapped = headers.map(function (h) {
    return HEADER_ALIASES[h] || null;
  });
  if (mapped.indexOf("handle") === -1 || mapped.indexOf("expectedViews") === -1) {
    return {
      ok: false,
      errors: ["Header must include handle (or creator) and expected_views (or views)."],
      rows: [],
    };
  }
  if (lines.length - 1 > MAX_ROWS) {
    errors.push("Roster is capped at " + MAX_ROWS + " creators. Extra rows were ignored.");
  }
  const body = lines.slice(1, MAX_ROWS + 1);
  const rows = [];
  const seen = Object.create(null);
  body.forEach(function (line, idx) {
    const cells = splitLine(line, delimiter);
    const raw = {};
    mapped.forEach(function (key, i) {
      if (!key) return;
      raw[key] = cells[i] == null ? "" : String(cells[i]).trim();
    });
    const handle = String(raw.handle || "").replace(/^@/, "").trim();
    if (!handle) {
      errors.push("Row " + (idx + 2) + " is missing a handle.");
      return;
    }
    const fold = handle.toLowerCase();
    if (seen[fold]) {
      errors.push("Duplicate handle: " + handle);
      return;
    }
    seen[fold] = true;
    rows.push({
      handle: handle,
      expectedViews: raw.expectedViews,
      quotedFee: raw.quotedFee || "",
      niche: raw.niche || "lifestyle",
      format: raw.format || "integration",
      usage: raw.usage || "organic",
      exclusivity: raw.exclusivity || "none",
      extraPlacements: raw.extraPlacements || "0",
    });
  });
  if (!rows.length) {
    return { ok: false, errors: errors.length ? errors : ["No usable creator rows."], rows: [] };
  }
  return { ok: true, errors: errors, rows: rows };
}

function planCampaign(text, planDeal) {
  if (typeof planDeal !== "function") {
    throw new Error("planCampaign needs DealMath.planDeal");
  }
  const parsed = parseRoster(text);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, creators: [] };
  }

  const creators = [];
  const rowErrors = parsed.errors.slice();
  parsed.rows.forEach(function (row) {
    const result = planDeal({
      expectedViews: row.expectedViews,
      quotedFee: row.quotedFee,
      niche: row.niche,
      format: row.format,
      usage: row.usage,
      exclusivity: row.exclusivity,
      extraPlacements: row.extraPlacements,
    });
    if (!result.ok) {
      rowErrors.push(row.handle + ": " + result.errors.join(" "));
      return;
    }
    creators.push({
      handle: row.handle,
      expectedViews: result.expectedViews,
      quotedFee: result.quotedFee,
      suggestedMid: result.suggested.mid,
      suggestedLow: result.suggested.low,
      suggestedHigh: result.suggested.high,
      impliedCpm: result.impliedCpm,
      quotePosition: result.quoteCheck.position,
      niche: result.niche.id,
      format: result.format.id,
    });
  });

  if (!creators.length) {
    return { ok: false, errors: rowErrors.length ? rowErrors : ["No priced rows."], creators: [] };
  }

  let totalViews = 0;
  let totalQuoted = 0;
  let quotedCount = 0;
  let totalSuggestedMid = 0;
  let totalSuggestedLow = 0;
  let totalSuggestedHigh = 0;
  creators.forEach(function (c) {
    totalViews += c.expectedViews;
    totalSuggestedMid += c.suggestedMid;
    totalSuggestedLow += c.suggestedLow;
    totalSuggestedHigh += c.suggestedHigh;
    if (c.quotedFee != null) {
      totalQuoted += c.quotedFee;
      quotedCount += 1;
    }
  });

  const ranked = creators.slice().sort(function (a, b) {
    const ae = a.quotedFee != null ? a.quotedFee : a.suggestedMid;
    const be = b.quotedFee != null ? b.quotedFee : b.suggestedMid;
    return be - ae;
  });
  const spendBase = quotedCount ? totalQuoted : totalSuggestedMid;
  let topShare = 0;
  if (spendBase > 0) {
    const topSpend = ranked[0].quotedFee != null ? ranked[0].quotedFee : ranked[0].suggestedMid;
    topShare = topSpend / spendBase;
  }

  const blendedImpliedCpm =
    quotedCount && totalViews > 0 ? Math.round((totalQuoted / totalViews) * 1000 * 100) / 100 : null;
  const blendedSuggestedCpm =
    totalViews > 0 ? Math.round((totalSuggestedMid / totalViews) * 1000 * 100) / 100 : null;

  return {
    ok: true,
    errors: rowErrors,
    creators: creators,
    totals: {
      creatorCount: creators.length,
      expectedViews: totalViews,
      quotedFee: quotedCount ? Math.round(totalQuoted * 100) / 100 : null,
      quotedCount: quotedCount,
      suggestedLow: Math.round(totalSuggestedLow * 100) / 100,
      suggestedMid: Math.round(totalSuggestedMid * 100) / 100,
      suggestedHigh: Math.round(totalSuggestedHigh * 100) / 100,
      blendedImpliedCpm: blendedImpliedCpm,
      blendedSuggestedCpm: blendedSuggestedCpm,
      topHandle: ranked[0].handle,
      topSpendShare: Math.round(topShare * 1000) / 1000,
      concentrationWarning: topShare >= CONCENTRATION_WARN,
    },
    notes: [
      "Slate totals add each row independently. They do not model audience overlap.",
      "Concentration warning fires when one creator is 45% or more of quoted or suggested spend.",
      "Handles are labels only. Do not paste emails or private contact data.",
    ],
  };
}

function campaignToCsv(result) {
  if (!result || !result.ok) return "";
  const rows = [
    ["handle", "expected_views", "quoted_fee", "suggested_mid", "implied_cpm", "quote_position", "niche", "format"],
  ];
  result.creators.forEach(function (c) {
    rows.push([
      c.handle,
      c.expectedViews,
      c.quotedFee,
      c.suggestedMid,
      c.impliedCpm,
      c.quotePosition,
      c.niche,
      c.format,
    ]);
  });
  rows.push([]);
  rows.push(["creator_count", result.totals.creatorCount]);
  rows.push(["total_expected_views", result.totals.expectedViews]);
  rows.push(["total_quoted_fee", result.totals.quotedFee]);
  rows.push(["total_suggested_mid", result.totals.suggestedMid]);
  rows.push(["blended_implied_cpm", result.totals.blendedImpliedCpm]);
  rows.push(["top_handle", result.totals.topHandle]);
  rows.push(["top_spend_share", result.totals.topSpendShare]);
  return rows.map(function (row) {
    return row.map(csvSafe).join(",");
  }).join("\n") + "\n";
}

const api = {
  MAX_ROWS,
  CONCENTRATION_WARN,
  parseRoster,
  planCampaign,
  campaignToCsv,
  csvSafe,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
if (typeof window !== "undefined") {
  window.CampaignMath = api;
}
