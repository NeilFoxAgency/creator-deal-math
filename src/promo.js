/**
 * Discount-code / promo attribution vs flat fee vs affiliate percent.
 * Offline only. Planning helper, not Shopify or YouTube Analytics.
 */

"use strict";

function roundCents(n) {
  return Math.round(Number(n) * 100) / 100;
}

function parseMoney(value, label, required) {
  if (value == null || String(value).trim() === "") {
    if (required) return { ok: false, error: label + " is required." };
    return { ok: true, value: null };
  }
  const n = Number(String(value).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: label + " must be a number 0 or greater." };
  }
  if (n > 10000000) {
    return { ok: false, error: label + " is above the $10,000,000 planning cap." };
  }
  return { ok: true, value: roundCents(n) };
}

function parseCount(value, label, required) {
  if (value == null || String(value).trim() === "") {
    if (required) return { ok: false, error: label + " is required." };
    return { ok: true, value: null };
  }
  const n = Number(String(value).replace(/[,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0 || n !== Math.floor(n)) {
    return { ok: false, error: label + " must be a whole number 0 or greater." };
  }
  if (n > 10000000) {
    return { ok: false, error: label + " is above the planning cap." };
  }
  return { ok: true, value: n };
}

function parsePercent(value, label, max, required) {
  if (value == null || String(value).trim() === "") {
    if (required) return { ok: false, error: label + " is required." };
    return { ok: true, value: null };
  }
  const n = Number(String(value).replace(/%/g, "").trim());
  if (!Number.isFinite(n) || n < 0 || n > max) {
    return { ok: false, error: label + " must be between 0 and " + max + "." };
  }
  return { ok: true, value: n };
}

function csvSafe(cell) {
  let s = String(cell == null ? "" : cell);
  if (/^[=+\-@\t\r\n]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/**
 * Compare a unique creator discount code against a flat sponsorship fee
 * and an optional affiliate-percent alternative.
 */
function planPromo(input) {
  const errors = [];
  const fee = parseMoney(input && input.flatFee, "Flat fee", true);
  if (!fee.ok) errors.push(fee.error);
  const redemptions = parseCount(input && input.redemptions, "Redemptions", true);
  if (!redemptions.ok) errors.push(redemptions.error);
  const aov = parseMoney(input && input.aov, "Average order value", true);
  if (!aov.ok) errors.push(aov.error);
  const discount = parsePercent(input && input.discountPercent, "Discount percent", 100, true);
  if (!discount.ok) errors.push(discount.error);
  const affiliate = parsePercent(input && input.affiliatePercent, "Affiliate percent", 50, false);
  if (!affiliate.ok) errors.push(affiliate.error);
  if (errors.length) {
    return { ok: false, errors: errors };
  }

  const orders = redemptions.value;
  const ticket = aov.value;
  const discRate = discount.value / 100;
  const grossRevenue = roundCents(orders * ticket);
  const discountCost = roundCents(grossRevenue * discRate);
  const netRevenue = roundCents(grossRevenue - discountCost);
  const flat = fee.value;
  const brandNetAfterFlat = roundCents(netRevenue - flat);
  const cpaOnGross = orders > 0 ? roundCents(flat / orders) : null;
  const effectiveRoas = flat > 0 ? roundCents(netRevenue / flat) : null;

  let affiliatePayout = null;
  let brandNetAfterAffiliate = null;
  let cheaperLabel = "Need an affiliate percent to compare.";
  let cheaperId = "no_affiliate";
  if (affiliate.value != null) {
    affiliatePayout = roundCents(grossRevenue * (affiliate.value / 100));
    brandNetAfterAffiliate = roundCents(netRevenue - affiliatePayout);
    if (flat < affiliatePayout) {
      cheaperId = "flat_cheaper";
      cheaperLabel =
        "Flat fee costs less than this affiliate percent on the same redemptions.";
    } else if (flat > affiliatePayout) {
      cheaperId = "affiliate_cheaper";
      cheaperLabel =
        "This affiliate percent would have cost less than the flat fee on the same redemptions.";
    } else {
      cheaperId = "tie";
      cheaperLabel = "Flat fee and affiliate percent cost the same on these redemptions.";
    }
  }

  return {
    ok: true,
    errors: [],
    flatFee: flat,
    redemptions: orders,
    aov: ticket,
    discountPercent: discount.value,
    affiliatePercent: affiliate.value,
    grossRevenue: grossRevenue,
    discountCost: discountCost,
    netRevenue: netRevenue,
    brandNetAfterFlat: brandNetAfterFlat,
    cpaOnGross: cpaOnGross,
    effectiveRoas: effectiveRoas,
    affiliatePayout: affiliatePayout,
    brandNetAfterAffiliate: brandNetAfterAffiliate,
    comparison: cheaperId,
    comparisonLabel: cheaperLabel,
    notes: [
      "Redemptions are an input. This tool does not pull Shopify, Amazon, or YouTube data.",
      "Gross revenue uses pre-discount AOV. Discount cost is that AOV times the code percent.",
      "Affiliate comparison applies the percent to pre-discount gross, which is a common affiliate convention, not a contract term.",
      "Codes are not unique proof of attribution. Friends, reuse, and stacked promos can inflate counts.",
    ],
  };
}

function promoToCsv(result) {
  if (!result || !result.ok) return "";
  const rows = [
    ["Field", "Value"],
    ["Flat fee", result.flatFee],
    ["Redemptions", result.redemptions],
    ["AOV", result.aov],
    ["Discount percent", result.discountPercent],
    ["Gross revenue", result.grossRevenue],
    ["Discount cost", result.discountCost],
    ["Net revenue after discount", result.netRevenue],
    ["Brand net after flat fee", result.brandNetAfterFlat],
    ["CPA on redemptions", result.cpaOnGross],
    ["Effective ROAS on net revenue", result.effectiveRoas],
    ["Affiliate percent", result.affiliatePercent],
    ["Affiliate payout", result.affiliatePayout],
    ["Brand net after affiliate", result.brandNetAfterAffiliate],
    ["Comparison", result.comparison],
  ];
  return (
    rows
      .map(function (row) {
        return row.map(csvSafe).join(",");
      })
      .join("\n") + "\n"
  );
}

const api = {
  planPromo: planPromo,
  promoToCsv: promoToCsv,
  csvSafe: csvSafe,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
if (typeof window !== "undefined") {
  window.PromoMath = api;
}
