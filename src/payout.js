/**
 * Payment-milestone planner for a single deal or a campaign slate.
 * Offline only. No I/O. Planning helper, not a contract clause.
 */

"use strict";

const POLICIES = {
  fifty_fifty: {
    id: "fifty_fifty",
    label: "50% on booking / 50% on live",
    shares: [
      { id: "booking", label: "Booking deposit", share: 0.5, offsetDays: -14 },
      { id: "live", label: "Go-live balance", share: 0.5, offsetDays: 0 },
    ],
  },
  all_on_live: {
    id: "all_on_live",
    label: "100% on live",
    shares: [{ id: "live", label: "Go-live payment", share: 1, offsetDays: 0 }],
  },
  thirty_forty_thirty: {
    id: "thirty_forty_thirty",
    label: "30% booking / 40% live / 30% after 30-day window",
    shares: [
      { id: "booking", label: "Booking deposit", share: 0.3, offsetDays: -14 },
      { id: "live", label: "Go-live payment", share: 0.4, offsetDays: 0 },
      { id: "window", label: "Post-window holdback", share: 0.3, offsetDays: 30 },
    ],
  },
  net30_live: {
    id: "net30_live",
    label: "100% net-30 after live",
    shares: [{ id: "window", label: "Net-30 after live", share: 1, offsetDays: 30 }],
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

function parseLiveDate(value) {
  if (value == null || String(value).trim() === "") return { ok: true, value: null };
  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { ok: false, error: "Live date must be YYYY-MM-DD if provided." };
  }
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return { ok: false, error: "Live date is not a real calendar day." };
  }
  return { ok: true, value: s };
}

function addDays(iso, days) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return yy + "-" + mm + "-" + dd;
}

function csvSafe(cell) {
  let s = String(cell == null ? "" : cell);
  if (/^[=+\-@\t\r\n]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function planPayout(input) {
  const errors = [];
  const fee = parseFee(input && input.fee);
  if (!fee.ok) errors.push(fee.error);
  const policyId = input && input.policy ? String(input.policy) : "fifty_fifty";
  const policy = POLICIES[policyId];
  if (!policy) errors.push("Unknown payout policy.");
  const live = parseLiveDate(input && input.liveDate);
  if (!live.ok) errors.push(live.error);
  if (errors.length) return { ok: false, errors: errors, milestones: [] };

  const shares = policy.shares;
  const milestones = [];
  let allocated = 0;
  shares.forEach(function (part, idx) {
    let amount;
    if (idx === shares.length - 1) {
      amount = roundCents(fee.value - allocated);
    } else {
      amount = roundCents(fee.value * part.share);
      allocated += amount;
    }
    milestones.push({
      id: part.id,
      label: part.label,
      share: part.share,
      amount: amount,
      offsetDays: part.offsetDays,
      date: addDays(live.value, part.offsetDays),
    });
  });

  const byBucket = { booking: 0, live: 0, window: 0 };
  milestones.forEach(function (m) {
    if (byBucket[m.id] != null) byBucket[m.id] = roundCents(byBucket[m.id] + m.amount);
  });

  return {
    ok: true,
    errors: [],
    fee: fee.value,
    policy: policy.id,
    policyLabel: policy.label,
    liveDate: live.value,
    milestones: milestones,
    buckets: byBucket,
    notes: [
      "Milestone dates assume booking 14 days before live when a live date is provided.",
      "Amounts are a cash-flow sketch, not invoice terms or a contract clause.",
    ],
  };
}

function planCampaignPayouts(campaignResult, options) {
  options = options || {};
  if (!campaignResult || !campaignResult.ok || !campaignResult.creators || !campaignResult.creators.length) {
    return { ok: false, errors: ["Price a campaign slate before planning payouts."], creators: [] };
  }
  const policyId = options.policy || "fifty_fifty";
  const liveDate = options.liveDate;
  const creators = [];
  const errors = [];
  campaignResult.creators.forEach(function (c) {
    const fee = c.quotedFee != null ? c.quotedFee : c.suggestedMid;
    const planned = planPayout({ fee: fee, policy: policyId, liveDate: liveDate });
    if (!planned.ok) {
      errors.push(c.handle + ": " + planned.errors.join(" "));
      return;
    }
    creators.push({
      handle: c.handle,
      fee: planned.fee,
      feeSource: c.quotedFee != null ? "quoted" : "suggested_mid",
      milestones: planned.milestones,
      buckets: planned.buckets,
    });
  });
  if (!creators.length) {
    return { ok: false, errors: errors.length ? errors : ["No payable rows."], creators: [] };
  }

  const buckets = { booking: 0, live: 0, window: 0 };
  let totalFee = 0;
  creators.forEach(function (c) {
    totalFee += c.fee;
    buckets.booking += c.buckets.booking;
    buckets.live += c.buckets.live;
    buckets.window += c.buckets.window;
  });

  const sample = planPayout({ fee: totalFee, policy: policyId, liveDate: liveDate });

  return {
    ok: true,
    errors: errors,
    policy: policyId,
    policyLabel: sample.ok ? sample.policyLabel : policyId,
    liveDate: sample.ok ? sample.liveDate : null,
    creators: creators,
    totals: {
      fee: roundCents(totalFee),
      booking: roundCents(buckets.booking),
      live: roundCents(buckets.live),
      window: roundCents(buckets.window),
      creatorCount: creators.length,
    },
    slateMilestones: sample.ok ? sample.milestones : [],
    notes: [
      "Per-creator fees use quoted_fee when present, otherwise suggested mid.",
      "Dates are shared across the slate when a live date is entered. Staggered live dates are out of scope.",
    ],
  };
}

function payoutToCsv(result) {
  if (!result || !result.ok) return "";
  const rows = [["handle", "fee_source", "fee", "milestone", "share", "amount", "date"]];
  const list = result.creators || [];
  if (list.length) {
    list.forEach(function (c) {
      c.milestones.forEach(function (m) {
        rows.push([c.handle, c.feeSource, c.fee, m.label, m.share, m.amount, m.date]);
      });
    });
  } else if (result.milestones) {
    result.milestones.forEach(function (m) {
      rows.push(["deal", "quoted", result.fee, m.label, m.share, m.amount, m.date]);
    });
  }
  if (result.totals) {
    rows.push([]);
    rows.push(["total_fee", result.totals.fee]);
    rows.push(["total_booking", result.totals.booking]);
    rows.push(["total_live", result.totals.live]);
    rows.push(["total_window", result.totals.window]);
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
  POLICIES,
  planPayout,
  planCampaignPayouts,
  payoutToCsv,
  csvSafe,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
if (typeof window !== "undefined") {
  window.PayoutMath = api;
}
