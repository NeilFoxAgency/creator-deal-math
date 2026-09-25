"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const math = require("../src/deal-math");

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
