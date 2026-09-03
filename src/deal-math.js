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

/**
 * Paid usage / amplification rights on top of organic posting.
 * Multipliers are planning defaults, not a rate card.
 */
const USAGE_RIGHTS = Object.freeze({
  organic: {
    id: "organic",
    label: "Organic post only (no paid reuse)",
    multiplier: 1,
  },
  boost30: {
    id: "boost30",
    label: "Paid boost / spark / whitelist up to 30 days",
    multiplier: 1.2,
  },
  whitelist90: {
    id: "whitelist90",
    label: "Whitelisting / paid usage up to 90 days",
    multiplier: 1.4,
  },
  perpetual: {
    id: "perpetual",
    label: "Perpetual paid usage / always-on ads",
    multiplier: 1.75,
  },
});

/**
 * Category exclusivity windows. Multipliers are planning defaults.
 */
const EXCLUSIVITY = Object.freeze({
  none: {
    id: "none",
    label: "No exclusivity",
    multiplier: 1,
  },
  days30: {
    id: "days30",
    label: "Category exclusive 30 days",
    multiplier: 1.15,
  },
  days60: {
    id: "days60",
    label: "Category exclusive 60 days",
    multiplier: 1.25,
  },
  days90: {
    id: "days90",
    label: "Category exclusive 90 days",
    multiplier: 1.4,
  },
});

/** Extra organic placements priced as a fraction of the base mid fee. */
const EXTRA_PLACEMENT_FRACTION = 0.15;
const MAX_EXTRA_PLACEMENTS = 8;

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
  const extraPlacementsRaw = toNumber(raw.extraPlacements);

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

  let extraPlacements = 0;
  if (extraPlacementsRaw != null) {
    if (
      extraPlacementsRaw < 0 ||
      extraPlacementsRaw > MAX_EXTRA_PLACEMENTS ||
      extraPlacementsRaw !== Math.floor(extraPlacementsRaw)
    ) {
      errors.push("Extra placements must be a whole number from 0 to " + MAX_EXTRA_PLACEMENTS + ".");
    } else {
      extraPlacements = extraPlacementsRaw;
    }
  }

  const format = FORMATS[raw.format] || FORMATS.integration;
  const usage = USAGE_RIGHTS[raw.usage] || USAGE_RIGHTS.organic;
  const exclusivity = EXCLUSIVITY[raw.exclusivity] || EXCLUSIVITY.none;
  if (raw.usage && !USAGE_RIGHTS[raw.usage]) {
    errors.push("Unknown usage rights option.");
  }
  if (raw.exclusivity && !EXCLUSIVITY[raw.exclusivity]) {
    errors.push("Unknown exclusivity option.");
  }

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
      extraPlacements,
      format,
      usage,
      exclusivity,
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

function applyAddOns(baseFee, usageMultiplier, exclusivityMultiplier, extraPlacements) {
  const withRights = baseFee * usageMultiplier * exclusivityMultiplier;
  const extras = baseFee * EXTRA_PLACEMENT_FRACTION * extraPlacements;
  return roundMoney(withRights + extras);
}

function compareQuote(quotedFee, suggested) {
  if (quotedFee == null) {
    return { present: false, ratioToMid: null, position: "none", label: "No quote entered" };
  }
  const ratioToMid = suggested.mid > 0 ? roundMoney(quotedFee / suggested.mid) : null;
  let position = "in_range";
  let label = "Quote sits inside the planning range";
  if (quotedFee < suggested.low) {
    position = "below";
    label = "Quote is below the planning low";
  } else if (quotedFee > suggested.high) {
    position = "above";
    label = "Quote is above the planning high";
  }
  return { present: true, ratioToMid, position, label };
}

function planDeal(raw) {
  const checked = validateInputs(raw);
  if (!checked.ok) {
    return { ok: false, errors: checked.errors };
  }

  const v = checked.values;
  const formatMultiplier = v.format.multiplier;
  const organicBase = {
    low: feeFromCpm(v.expectedViews, v.niche.low, formatMultiplier),
    mid: feeFromCpm(v.expectedViews, v.niche.mid, formatMultiplier),
    high: feeFromCpm(v.expectedViews, v.niche.high, formatMultiplier),
  };
  const suggested = {
    low: applyAddOns(organicBase.low, v.usage.multiplier, v.exclusivity.multiplier, v.extraPlacements),
    mid: applyAddOns(organicBase.mid, v.usage.multiplier, v.exclusivity.multiplier, v.extraPlacements),
    high: applyAddOns(organicBase.high, v.usage.multiplier, v.exclusivity.multiplier, v.extraPlacements),
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
    usage: v.usage,
    exclusivity: v.exclusivity,
    extraPlacements: v.extraPlacements,
    expectedViews: v.expectedViews,
    quotedFee: v.quotedFee,
    actualViews: v.actualViews,
    organicBase: {
      low: roundMoney(organicBase.low),
      mid: roundMoney(organicBase.mid),
      high: roundMoney(organicBase.high),
    },
    suggested,
    quoteCheck: compareQuote(v.quotedFee, suggested),
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
      "Usage, exclusivity, and extra-placement add-ons are planning multipliers, not a legal rate card.",
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
    ["Usage rights", result.usage.id],
    ["Exclusivity", result.exclusivity.id],
    ["Extra placements", result.extraPlacements],
    ["Expected views", result.expectedViews],
    ["Organic base mid", result.organicBase.mid],
    ["Suggested fee low", result.suggested.low],
    ["Suggested fee mid", result.suggested.mid],
    ["Suggested fee high", result.suggested.high],
    ["Quoted fee", result.quotedFee],
    ["Quote position", result.quoteCheck.position],
    ["Quote / mid", result.quoteCheck.ratioToMid],
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
  USAGE_RIGHTS,
  EXCLUSIVITY,
  EXTRA_PLACEMENT_FRACTION,
  MAX_EXTRA_PLACEMENTS,
  toNumber,
  validateInputs,
  feeFromCpm,
  cpmFromFee,
  applyAddOns,
  compareQuote,
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
