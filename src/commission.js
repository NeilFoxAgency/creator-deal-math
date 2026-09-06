/**
 * Agency commission split for a quoted creator fee.
 * Offline only. Planning helper, not a rate card or MSA clause.
 */

"use strict";

const MODELS = {
  brand_markup: {
    id: "brand_markup",
    label: "Brand markup (creator keeps the quoted fee)",
    hint: "Agency fee is added on top of the quoted creator fee. Brand cash-out is fee + commission.",
  },
  creator_withhold: {
    id: "creator_withhold",
    label: "Withhold from creator (brand pays the quoted fee)",
    hint: "Agency keeps a share of the quoted fee. Creator net is fee minus commission.",
  },
  split_even: {
    id: "split_even",
    label: "Split the commission 50/50",
    hint: "Half the commission is added to the brand invoice; half is withheld from the creator.",
  },
};

function roundCents(n) {
  return Math.round(Number(n) * 100) / 100;
}

function parseFee(value) {
  if (value == null || String(value).trim() === "") {
    return { ok: false, error: "Fee is required." };
  }
  const n = Number(String(value).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: "Fee must be a number 0 or greater." };
  }
  if (n > 10000000) {
    return { ok: false, error: "Fee is above the $10,000,000 planning cap." };
  }
  return { ok: true, value: roundCents(n) };
}

function parseRate(value) {
  if (value == null || String(value).trim() === "") {
    return { ok: false, error: "Commission percent is required." };
  }
  const n = Number(String(value).replace(/%/g, "").trim());
  if (!Number.isFinite(n) || n < 0 || n > 50) {
    return { ok: false, error: "Commission percent must be between 0 and 50." };
  }
  return { ok: true, value: n };
}

function csvSafe(cell) {
  let s = String(cell == null ? "" : cell);
  if (/^[=+\-@\t\r\n]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function planCommission(input) {
  const errors = [];
  const fee = parseFee(input && input.fee);
  if (!fee.ok) errors.push(fee.error);
  const rate = parseRate(input && input.percent);
  if (!rate.ok) errors.push(rate.error);
  const modelId = input && input.model ? String(input.model) : "brand_markup";
  const model = MODELS[modelId];
  if (!model) errors.push("Unknown commission model.");
  if (errors.length) {
    return { ok: false, errors: errors, creatorNet: null, agencyFee: null, brandTotal: null };
  }

  const quoted = fee.value;
  const pct = rate.value / 100;
  const fullCommission = roundCents(quoted * pct);

  let creatorNet;
  let agencyFee;
  let brandTotal;
  let brandMarkup;
  let withheld;

  if (modelId === "brand_markup") {
    brandMarkup = fullCommission;
    withheld = 0;
    agencyFee = fullCommission;
    creatorNet = quoted;
    brandTotal = roundCents(quoted + fullCommission);
  } else if (modelId === "creator_withhold") {
    brandMarkup = 0;
    withheld = fullCommission;
    agencyFee = fullCommission;
    creatorNet = roundCents(quoted - fullCommission);
    brandTotal = quoted;
  } else {
    withheld = roundCents(fullCommission / 2);
    brandMarkup = roundCents(fullCommission - withheld);
    agencyFee = roundCents(brandMarkup + withheld);
    creatorNet = roundCents(quoted - withheld);
    brandTotal = roundCents(quoted + brandMarkup);
  }

  return {
    ok: true,
    errors: [],
    quotedFee: quoted,
    percent: rate.value,
    model: model.id,
    modelLabel: model.label,
    hint: model.hint,
    agencyFee: agencyFee,
    creatorNet: creatorNet,
    brandTotal: brandTotal,
    brandMarkup: brandMarkup,
    withheldFromCreator: withheld,
    notes: [
      "Commission math is a planning sketch, not an MSA, W-9, or invoice term.",
      "Rates above 50% are rejected so a typo cannot invert the deal.",
    ],
  };
}

function planCampaignCommission(campaignResult, options) {
  options = options || {};
  if (!campaignResult || !campaignResult.ok || !campaignResult.creators || !campaignResult.creators.length) {
    return { ok: false, errors: ["Price a campaign slate before splitting commission."], creators: [] };
  }
  const creators = [];
  const errors = [];
  campaignResult.creators.forEach(function (c) {
    const fee = c.quotedFee != null ? c.quotedFee : c.suggestedMid;
    const planned = planCommission({
      fee: fee,
      percent: options.percent,
      model: options.model,
    });
    if (!planned.ok) {
      errors.push(c.handle + ": " + planned.errors.join(" "));
      return;
    }
    creators.push({
      handle: c.handle,
      feeSource: c.quotedFee != null ? "quoted" : "suggested_mid",
      quotedFee: planned.quotedFee,
      agencyFee: planned.agencyFee,
      creatorNet: planned.creatorNet,
      brandTotal: planned.brandTotal,
    });
  });
  if (!creators.length) {
    return { ok: false, errors: errors.length ? errors : ["No payable rows."], creators: [] };
  }

  const totals = creators.reduce(
    function (acc, c) {
      acc.quotedFee += c.quotedFee;
      acc.agencyFee += c.agencyFee;
      acc.creatorNet += c.creatorNet;
      acc.brandTotal += c.brandTotal;
      return acc;
    },
    { quotedFee: 0, agencyFee: 0, creatorNet: 0, brandTotal: 0 }
  );

  const sample = planCommission({
    fee: creators[0].quotedFee,
    percent: options.percent,
    model: options.model || "brand_markup",
  });

  return {
    ok: true,
    errors: errors,
    model: sample.ok ? sample.model : options.model,
    modelLabel: sample.ok ? sample.modelLabel : String(options.model || ""),
    percent: sample.ok ? sample.percent : Number(options.percent),
    creators: creators,
    totals: {
      quotedFee: roundCents(totals.quotedFee),
      agencyFee: roundCents(totals.agencyFee),
      creatorNet: roundCents(totals.creatorNet),
      brandTotal: roundCents(totals.brandTotal),
      creatorCount: creators.length,
    },
    notes: [
      "Per-creator fees use quoted_fee when present, otherwise suggested mid.",
      "One commission rate applies to the whole slate.",
    ],
  };
}

function commissionToCsv(result) {
  if (!result || !result.ok) return "";
  const rows = [["handle", "fee_source", "quoted_fee", "agency_fee", "creator_net", "brand_total"]];
  if (result.creators && result.creators.length) {
    result.creators.forEach(function (c) {
      rows.push([c.handle, c.feeSource, c.quotedFee, c.agencyFee, c.creatorNet, c.brandTotal]);
    });
  } else {
    rows.push(["deal", "quoted", result.quotedFee, result.agencyFee, result.creatorNet, result.brandTotal]);
  }
  if (result.totals) {
    rows.push([]);
    rows.push(["total_quoted", result.totals.quotedFee]);
    rows.push(["total_agency", result.totals.agencyFee]);
    rows.push(["total_creator_net", result.totals.creatorNet]);
    rows.push(["total_brand", result.totals.brandTotal]);
  }
  return (
    rows
      .map(function (row) {
        return row.map(csvSafe).join(",");
      })
      .join("\n") + "\n"
  );
}

const api = {
  MODELS,
  planCommission,
  planCampaignCommission,
  commissionToCsv,
  csvSafe,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
if (typeof window !== "undefined") {
  window.CommissionMath = api;
}
