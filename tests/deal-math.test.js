"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const math = require("../src/deal-math");
const { wrap, planMakeGood, MAKEGOOD_POLICIES } = require("../src/makegood");

const mathWithMakegood = wrap(math);

test("feeFromCpm uses views / 1000 * CPM * multiplier", () => {
  assert.equal(math.feeFromCpm(50000, 20, 1), 1000);
  assert.equal(math.feeFromCpm(50000, 20, 1.4), 1400);
  assert.equal(math.feeFromCpm(50000, 20, 0.5), 500);
});

test("cpmFromFee is the inverse of feeFromCpm at multiplier 1", () => {
  const views = 80000;
  const fee = math.feeFromCpm(views, 25, 1);
  assert.equal(math.cpmFromFee(fee, views), 25);
});

test("planDeal rejects missing views", () => {
  const result = math.planDeal({ expectedViews: "", niche: "tech", format: "integration" });
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /Expected views/);
});

test("planDeal rejects inverted custom CPM", () => {
  const result = math.planDeal({
    expectedViews: 10000,
    niche: "custom",
    customCpmLow: 40,
    customCpmMid: 20,
    customCpmHigh: 50,
    format: "integration",
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /low <= mid <= high/);
});

test("planDeal returns lifestyle integration range for 10k views", () => {
  const result = math.planDeal({
    expectedViews: 10000,
    niche: "lifestyle",
    format: "integration",
  });
  assert.equal(result.ok, true);
  assert.equal(result.suggested.low, 150);
  assert.equal(result.suggested.mid, 220);
  assert.equal(result.suggested.high, 300);
});

test("dedicated format applies 1.4x to the same CPM band", () => {
  const base = math.planDeal({
    expectedViews: 20000,
    niche: "tech",
    format: "integration",
  });
  const dedicated = math.planDeal({
    expectedViews: 20000,
    niche: "tech",
    format: "dedicated",
  });
  assert.equal(dedicated.suggested.mid, Math.round(base.suggested.mid * 1.4 * 100) / 100);
});

test("quoted fee produces implied and delivered CPM", () => {
  const result = math.planDeal({
    expectedViews: 200000,
    quotedFee: 5000,
    actualViews: 150000,
    niche: "education",
    format: "integration",
  });
  assert.equal(result.impliedCpm, 25);
  assert.equal(result.deliveredCpm, 33.33);
});

test("funnel uses quoted fee when present", () => {
  const result = math.planDeal({
    expectedViews: 10000,
    quotedFee: 400,
    ctrPercent: 2,
    cvrPercent: 10,
    aov: 50,
    niche: "lifestyle",
    format: "integration",
  });
  assert.equal(result.funnel.estimatedClicks, 200);
  assert.equal(result.funnel.estimatedConversions, 20);
  assert.equal(result.funnel.estimatedRevenue, 1000);
  assert.equal(result.funnel.cpa, 20);
  assert.equal(result.funnel.roas, 2.5);
});

test("breakeven CVR is fee / (clicks * AOV)", () => {
  const result = math.planDeal({
    expectedViews: 10000,
    quotedFee: 400,
    ctrPercent: 2,
    aov: 50,
    niche: "lifestyle",
    format: "integration",
  });
  assert.equal(result.funnel.breakevenCvrPercent, 4);
});

test("csvSafe prefixes formula-like cells", () => {
  assert.equal(math.csvSafe("=CMD()"), "'=CMD()");
  assert.equal(math.csvSafe("hello,world"), '"hello,world"');
});

test("resultToCsv includes suggested mid fee", () => {
  const result = math.planDeal({
    expectedViews: 10000,
    niche: "gaming",
    format: "shorts",
  });
  const csv = math.resultToCsv(result);
  assert.match(csv, /Suggested fee mid,/);
  assert.match(csv, /Format,shorts/);
});

test("CTR above 100 is rejected", () => {
  const result = math.planDeal({
    expectedViews: 1000,
    ctrPercent: 120,
    niche: "tech",
    format: "integration",
  });
  assert.equal(result.ok, false);
});

test("organic defaults leave suggested fees unchanged", () => {
  const result = math.planDeal({
    expectedViews: 10000,
    niche: "lifestyle",
    format: "integration",
  });
  assert.equal(result.usage.id, "organic");
  assert.equal(result.exclusivity.id, "none");
  assert.equal(result.extraPlacements, 0);
  assert.equal(result.organicBase.mid, 220);
  assert.equal(result.suggested.mid, 220);
  assert.equal(result.quoteCheck.position, "none");
});

test("30-day whitelist multiplies the organic base", () => {
  const result = math.planDeal({
    expectedViews: 10000,
    niche: "lifestyle",
    format: "integration",
    usage: "boost30",
  });
  assert.equal(result.organicBase.mid, 220);
  assert.equal(result.suggested.mid, 264);
});

test("exclusivity and extra placements stack on the organic base", () => {
  const result = math.planDeal({
    expectedViews: 10000,
    niche: "lifestyle",
    format: "integration",
    usage: "organic",
    exclusivity: "days30",
    extraPlacements: 2,
  });
  // mid base 220; 220 * 1 * 1.15 + 220 * 0.15 * 2 = 253 + 66 = 319
  assert.equal(result.suggested.mid, 319);
});

test("quoted fee is flagged above the add-on range", () => {
  const result = math.planDeal({
    expectedViews: 10000,
    quotedFee: 900,
    niche: "lifestyle",
    format: "integration",
    usage: "organic",
    exclusivity: "none",
  });
  assert.equal(result.quoteCheck.position, "above");
  assert.equal(result.quoteCheck.ratioToMid, 4.09);
});

test("unknown usage option is rejected", () => {
  const result = math.planDeal({
    expectedViews: 10000,
    niche: "lifestyle",
    format: "integration",
    usage: "secret-clause",
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /Unknown usage/);
});

test("extra placements above the cap are rejected", () => {
  const result = math.planDeal({
    expectedViews: 10000,
    niche: "lifestyle",
    format: "integration",
    extraPlacements: 12,
  });
  assert.equal(result.ok, false);
});

test("resultToCsv records add-on fields", () => {
  const result = math.planDeal({
    expectedViews: 10000,
    niche: "lifestyle",
    format: "integration",
    usage: "whitelist90",
    exclusivity: "days60",
    extraPlacements: 1,
  });
  const csv = math.resultToCsv(result);
  assert.match(csv, /Usage rights,whitelist90/);
  assert.match(csv, /Exclusivity,days60/);
  assert.match(csv, /Extra placements,1/);
});

// --- Make-good planning (folded in so the existing CI command runs it) ---

test("wrap keeps organic lifestyle mid fee at 220", () => {
  const result = mathWithMakegood.planDeal({
    expectedViews: 10000,
    niche: "lifestyle",
    format: "integration",
  });
  assert.equal(result.ok, true);
  assert.equal(result.suggested.mid, 220);
  assert.equal(result.makegood.present, false);
  assert.equal(result.makegood.policy.id, "report");
});

test("report policy records a 70% delivery shortfall without a credit", () => {
  const result = mathWithMakegood.planDeal({
    expectedViews: 10000,
    actualViews: 7000,
    quotedFee: 400,
    niche: "lifestyle",
    format: "integration",
    makegoodPolicy: "report",
  });
  assert.equal(result.makegood.present, true);
  assert.equal(result.makegood.deliveryPercent, 70);
  assert.equal(result.makegood.shortfallViews, 3000);
  assert.equal(result.makegood.triggered, false);
  assert.equal(result.makegood.credit, null);
});

test("prorata credit is fee times missed view share", () => {
  const result = mathWithMakegood.planDeal({
    expectedViews: 10000,
    actualViews: 7000,
    quotedFee: 400,
    niche: "lifestyle",
    format: "integration",
    makegoodPolicy: "prorata",
  });
  assert.equal(result.makegood.triggered, true);
  assert.equal(result.makegood.credit, 120);
});

test("80% floor does not credit a 90% delivery", () => {
  const result = mathWithMakegood.planDeal({
    expectedViews: 10000,
    actualViews: 9000,
    quotedFee: 400,
    niche: "lifestyle",
    format: "integration",
    makegoodPolicy: "floor80",
  });
  assert.equal(result.makegood.triggered, false);
  assert.equal(result.makegood.credit, null);
});

test("80% floor credits only the gap below 8000 views", () => {
  const result = mathWithMakegood.planDeal({
    expectedViews: 10000,
    actualViews: 6000,
    quotedFee: 400,
    niche: "lifestyle",
    format: "integration",
    makegoodPolicy: "floor80",
  });
  assert.equal(result.makegood.triggered, true);
  assert.equal(result.makegood.credit, 80);
  assert.equal(result.makegood.floorViews, 8000);
});

test("extra-asset policy suggests one placement below 80%", () => {
  const result = mathWithMakegood.planDeal({
    expectedViews: 20000,
    actualViews: 14000,
    quotedFee: 800,
    niche: "tech",
    format: "integration",
    makegoodPolicy: "extra_asset_80",
  });
  assert.equal(result.makegood.triggered, true);
  assert.equal(result.makegood.extraAssetSuggested, true);
  assert.equal(result.makegood.credit, null);
});

test("unknown make-good policy is rejected", () => {
  const result = mathWithMakegood.planDeal({
    expectedViews: 10000,
    niche: "lifestyle",
    format: "integration",
    makegoodPolicy: "secret-clause",
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /Unknown make-good/);
});

test("resultToCsv records make-good fields", () => {
  const result = mathWithMakegood.planDeal({
    expectedViews: 10000,
    actualViews: 5000,
    quotedFee: 400,
    niche: "lifestyle",
    format: "integration",
    makegoodPolicy: "prorata",
  });
  const csv = mathWithMakegood.resultToCsv(result);
  assert.match(csv, /Make-good policy,prorata/);
  assert.match(csv, /Delivery percent,50/);
  assert.match(csv, /Make-good credit,200/);
});

test("planMakeGood is exported for direct use", () => {
  const out = planMakeGood(10000, 8000, 500, MAKEGOOD_POLICIES.prorata);
  assert.equal(out.credit, 100);
  assert.equal(out.deliveryPercent, 80);
});
