/**
 * Pure sponsorship deal math. No I/O. Safe to run in Node tests or a browser.
 *
 * These formulas estimate planning ranges. They are not quotes, rate cards,
 * or promises of views, clicks, sales, or ROI.
 */

"use strict";

const FORMATS = Object.freeze({
  integration: {
    id: "integration",
    label: "Integrated mention (60-90s in an existing video)",
    multiplier: 1,
  },
  dedicated: {
    id: "dedicated",
    label: "Dedicated video",
    multiplier: 1.4,
  },
  shorts: {
    id: "shorts",
    label: "Shorts / vertical clip",
    multiplier: 0.5,
  },
  mention: {
    id: "mention",
    label: "Short mention or end-card only",
    multiplier: 0.7,
  },
});

const NICHE_CPM = Object.freeze({
  finance: { id: "finance", label: "Finance / business / B2B", low: 40, mid: 60, high: 80 },
  tech: { id: "tech", label: "Tech / reviews / productivity", low: 25, mid: 35, high: 50 },
  education: { id: "education", label: "Education / self-improvement", low: 20, mid: 30, high: 40 },
  lifestyle: { id: "lifestyle", label: "Lifestyle / beauty / food", low: 15, mid: 22, high: 30 },
  gaming: { id: "gaming", label: "Gaming / entertainment", low: 12, mid: 18, high: 28 },
  custom: { id: "custom", label: "Custom CPM range", low: null, mid: null, high: null },
});

function toNumber(value) {
  if (value === "" || value == null) return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

function validateInputs(raw) {
  const errors = [];
  const expectedViews = toNumber(raw.expectedViews);
  const quotedFee = toNumber(raw.quotedFee);
  const actualViews = toNumber(raw.actualViews);
  const ctrPercent = toNumber(raw.ctrPercent);
  const cvrPercent = toNumber(raw.cvrPercent);
  const aov = toNumber(raw.aov);
  const customLow = toNumber(raw.customCpmLow);
  const customMid = toNumber(raw.customCpmMid);
  const customHigh = toNumber(raw.customCpmHigh);

  if (expectedViews == null || expectedViews <= 0) {
    errors.push("Expected views must be a number greater than 0.");
  }
  if (quotedFee != null && quotedFee < 0) {
    errors.push("Quoted fee cannot be negative.");
  }
  if (actualViews != null && actualViews < 0) {
    errors.push("Actual views cannot be negative.");
  }
  if (ctrPercent != null && (ctrPercent < 0 || ctrPercent > 100)) {
    errors.push("CTR must be between 0 and 100.");
  }
  if (cvrPercent != null && (cvrPercent < 0 || cvrPercent > 100)) {
    errors.push("Conversion rate must be between 0 and 100.");
  }
  if (aov != null && aov < 0) {
    errors.push("Average order value cannot be negative.");
  }

  const format = FORMATS[raw.format] || FORMATS.integration;
  let niche = NICHE_CPM[raw.niche] || NICHE_CPM.lifestyle;
  if (raw.niche === "custom") {
    if (customLow == null || customMid == null || customHigh == null) {
      errors.push("Custom CPM needs low, mid, and high values.");
    } else if (customLow < 0 || customMid < 0 || customHigh < 0) {
      errors.push("Custom CPM values cannot be negative.");
    } else if (!(customLow <= customMid && customMid <= customHigh)) {
      errors.push("Custom CPM must satisfy low <= mid <= high.");
    } else {
      niche = {
        id: "custom",
        label: "Custom CPM range",
        low: customLow,
        mid: customMid,
        high: customHigh,
      };
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    values: {
      expectedViews,
      quotedFee,
      actualViews,
      ctrPercent,
      cvrPercent,
      aov,
      format,
      niche,
    },
  };
}

function feeFromCpm(views, cpm, multiplier) {
  return (views / 1000) * cpm * multiplier;
}

function cpmFromFee(fee, views) {
  if (!views) return null;
  return (fee / views) * 1000;
}

function planDeal(raw) {
  const checked = validateInputs(raw);
  if (!checked.ok) {
    return { ok: false, errors: checked.errors };
  }

  const v = checked.values;
  const multiplier = v.format.multiplier;
  const suggested = {
    low: roundMoney(feeFromCpm(v.expectedViews, v.niche.low, multiplier)),
    mid: roundMoney(feeFromCpm(v.expectedViews, v.niche.mid, multiplier)),
    high: roundMoney(feeFromCpm(v.expectedViews, v.niche.high, multiplier)),
  };

  const impliedCpm =
    v.quotedFee != null ? roundMoney(cpmFromFee(v.quotedFee, v.expectedViews)) : null;
  const deliveredCpm =
    v.quotedFee != null && v.actualViews != null && v.actualViews > 0
      ? roundMoney(cpmFromFee(v.quotedFee, v.actualViews))
      : null;

  const ctr = (v.ctrPercent == null ? 0 : v.ctrPercent) / 100;
  const cvr = (v.cvrPercent == null ? 0 : v.cvrPercent) / 100;
  const feeForFunnel = v.quotedFee != null ? v.quotedFee : suggested.mid;
  const estimatedClicks = v.expectedViews * ctr;
  const estimatedConversions = estimatedClicks * cvr;
  const estimatedRevenue = estimatedConversions * (v.aov || 0);
  const cpa =
    estimatedConversions > 0 ? roundMoney(feeForFunnel / estimatedConversions) : null;
  const roas =
    feeForFunnel > 0 && estimatedRevenue > 0
      ? roundMoney(estimatedRevenue / feeForFunnel)
      : null;
  const breakevenCvrPercent =
    estimatedClicks > 0 && v.aov > 0
      ? roundMoney((feeForFunnel / (estimatedClicks * v.aov)) * 100)
      : null;

  return {
    ok: true,
    errors: [],
    format: v.format,
    niche: v.niche,
    expectedViews: v.expectedViews,
    quotedFee: v.quotedFee,
    actualViews: v.actualViews,
    suggested,
    impliedCpm,
    deliveredCpm,
    funnel: {
      feeUsed: feeForFunnel,
      estimatedClicks: roundMoney(estimatedClicks),
      estimatedConversions: roundMoney(estimatedConversions),
      estimatedRevenue: roundMoney(estimatedRevenue),
      cpa,
      roas,
      breakevenCvrPercent,
    },
    notes: [
      "Use median views from recent comparable long-form videos, not subscriber count.",
      "Suggested fees are planning ranges, not a quote or a guarantee.",
      "Delivered CPM uses actual views after the measurement window (often 30 days).",
      "Funnel math is only as good as the CTR, conversion rate, and AOV you enter.",
    ],
  };
}

function csvSafe(cell) {
  let s = String(cell == null ? "" : cell);
  if (/^[=+\-@\t\r\n]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function resultToCsv(result) {
  if (!result || !result.ok) return "";
  const rows = [
    ["Field", "Value"],
    ["Format", result.format.id],
    ["Niche", result.niche.id],
    ["Expected views", result.expectedViews],
    ["Suggested fee low", result.suggested.low],
    ["Suggested fee mid", result.suggested.mid],
    ["Suggested fee high", result.suggested.high],
    ["Quoted fee", result.quotedFee],
    ["Implied CPM", result.impliedCpm],
    ["Actual views", result.actualViews],
    ["Delivered CPM", result.deliveredCpm],
    ["Estimated clicks", result.funnel.estimatedClicks],
    ["Estimated conversions", result.funnel.estimatedConversions],
    ["Estimated revenue", result.funnel.estimatedRevenue],
    ["CPA", result.funnel.cpa],
    ["ROAS", result.funnel.roas],
    ["Breakeven CVR %", result.funnel.breakevenCvrPercent],
  ];
  return rows.map((row) => row.map(csvSafe).join(",")).join("\n") + "\n";
}

const api = {
  FORMATS,
  NICHE_CPM,
  toNumber,
  validateInputs,
  feeFromCpm,
  cpmFromFee,
  planDeal,
  csvSafe,
  resultToCsv,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
 if (typeof window !== "undefined") {
  window.DealMath = api;
}
