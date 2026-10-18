/**
 * View-shortfall and make-good planning helpers.
 * Conversation tools only. Not a warranty, SLA, or contract clause.
 */
"use strict";

function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

const MAKEGOOD_POLICIES = Object.freeze({
  report: {
    id: "report",
    label: "Report delivery only (no make-good suggestion)",
    floor: 1,
    kind: "report",
  },
  prorata: {
    id: "prorata",
    label: "Pro-rata fee credit for every missed view",
    floor: 1,
    kind: "cash",
  },
  floor80: {
    id: "floor80",
    label: "Fee credit only if delivery is below 80% of expected views",
    floor: 0.8,
    kind: "cash",
  },
  extra_asset_80: {
    id: "extra_asset_80",
    label: "Suggest one extra organic asset if delivery is below 80%",
    floor: 0.8,
    kind: "asset",
  },
});

function planMakeGood(expectedViews, actualViews, quotedFee, policy) {
  policy = policy || MAKEGOOD_POLICIES.report;
  if (actualViews == null || expectedViews == null || expectedViews <= 0) {
    return {
      present: false,
      policy,
      deliveryRatio: null,
      deliveryPercent: null,
      shortfallViews: null,
      overdeliveryViews: null,
      floorViews: null,
      triggered: false,
      credit: null,
      extraAssetSuggested: false,
      label: "Enter actual views to measure delivery",
    };
  }
  const deliveryRatio = actualViews / expectedViews;
  const deliveryPercent = roundMoney(deliveryRatio * 100);
  const shortfallViews = Math.max(0, roundMoney(expectedViews - actualViews));
  const overdeliveryViews = Math.max(0, roundMoney(actualViews - expectedViews));
  const floorViews = roundMoney(expectedViews * policy.floor);
  const belowFloor = actualViews + 1e-9 < floorViews;
  let credit = null;
  let extraAssetSuggested = false;
  let triggered = false;
  let label = "Delivered " + deliveryPercent + "% of expected views";
  if (policy.kind === "report") {
    if (actualViews < expectedViews) {
      label = "Delivered " + deliveryPercent + "% of expected views (" + shortfallViews + " short)";
    } else if (actualViews > expectedViews) {
      label = "Delivered " + deliveryPercent + "% of expected views (" + overdeliveryViews + " over)";
    }
  } else if (policy.kind === "cash") {
    if (belowFloor && quotedFee != null && quotedFee > 0) {
      triggered = true;
      credit = roundMoney(quotedFee * ((floorViews - actualViews) / expectedViews));
      label =
        "Make-good credit " +
        credit +
        " under " +
        policy.id +
        " (" +
        deliveryPercent +
        "% delivered; floor " +
        Math.round(policy.floor * 100) +
        "%)";
    } else if (belowFloor) {
      triggered = true;
      label =
        "Delivery is below the " +
        Math.round(policy.floor * 100) +
        "% floor. Add a quoted fee to size a credit.";
    } else {
      label = "Delivery meets the " + Math.round(policy.floor * 100) + "% floor (" + deliveryPercent + "%)";
    }
  } else if (policy.kind === "asset") {
    if (belowFloor) {
      triggered = true;
      extraAssetSuggested = true;
      label = "Suggest one extra organic asset; delivery is " + deliveryPercent + "% versus an 80% floor";
    } else {
      label = "Delivery meets the 80% floor (" + deliveryPercent + "%); no extra asset suggested";
    }
  }
  return {
    present: true,
    policy,
    deliveryRatio: roundMoney(deliveryRatio),
    deliveryPercent,
    shortfallViews,
    overdeliveryViews,
    floorViews,
    triggered,
    credit,
    extraAssetSuggested,
    label,
  };
}

function csvSafe(cell) {
  let s = String(cell == null ? "" : cell);
  if (/^[=+\-@\t\r\n]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function wrap(api) {
  if (!api || typeof api.planDeal !== "function") {
    throw new Error("wrap() needs the DealMath API from deal-math.js");
  }
  const innerPlan = api.planDeal.bind(api);
  const innerCsv = api.resultToCsv ? api.resultToCsv.bind(api) : function () { return ""; };

  function planDeal(raw) {
    raw = raw || {};
    if (raw.makegoodPolicy && !MAKEGOOD_POLICIES[raw.makegoodPolicy]) {
      return { ok: false, errors: ["Unknown make-good policy."] };
    }
    const result = innerPlan(raw);
    if (!result.ok) return result;
    const policy = MAKEGOOD_POLICIES[raw.makegoodPolicy] || MAKEGOOD_POLICIES.report;
    result.makegood = planMakeGood(result.expectedViews, result.actualViews, result.quotedFee, policy);
    result.notes = (result.notes || []).concat([
      "Make-good figures are planning helpers for a conversation after the measurement window, not a contract clause.",
    ]);
    return result;
  }

  function resultToCsv(result) {
    let csv = innerCsv(result);
    if (!result || !result.ok || !result.makegood) return csv;
    const extra = [
      ["Make-good policy", result.makegood.policy.id],
      ["Delivery percent", result.makegood.deliveryPercent],
      ["View shortfall", result.makegood.shortfallViews],
      ["Make-good credit", result.makegood.credit],
      ["Extra asset suggested", result.makegood.extraAssetSuggested],
    ]
      .map(function (row) {
        return row.map(csvSafe).join(",");
      })
      .join("\n");
    return csv.replace(/\n$/, "") + "\n" + extra + "\n";
  }

  const wrapped = Object.assign({}, api, {
    MAKEGOOD_POLICIES,
    planMakeGood,
    planDeal,
    resultToCsv,
  });
  if (typeof window !== "undefined") {
    window.DealMath = wrapped;
  }
  return wrapped;
}

if (typeof window !== "undefined" && window.DealMath) {
  wrap(window.DealMath);
}

const exported = { MAKEGOOD_POLICIES, planMakeGood, wrap, csvSafe };
if (typeof module !== "undefined" && module.exports) {
  module.exports = exported;
}
