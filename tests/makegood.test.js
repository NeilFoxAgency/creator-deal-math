"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/deal-math");
const { wrap, planMakeGood, MAKEGOOD_POLICIES } = require("../src/makegood");

const math = wrap(core);

test("wrap keeps organic lifestyle mid fee at 220", () => {
  const result = math.planDeal({
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
  const result = math.planDeal({
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
  const result = math.planDeal({
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
  const result = math.planDeal({
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
  const result = math.planDeal({
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
  const result = math.planDeal({
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
  const result = math.planDeal({
    expectedViews: 10000,
    niche: "lifestyle",
    format: "integration",
    makegoodPolicy: "secret-clause",
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /Unknown make-good/);
});

test("resultToCsv records make-good fields", () => {
  const result = math.planDeal({
    expectedViews: 10000,
    actualViews: 5000,
    quotedFee: 400,
    niche: "lifestyle",
    format: "integration",
    makegoodPolicy: "prorata",
  });
  const csv = math.resultToCsv(result);
  assert.match(csv, /Make-good policy,prorata/);
  assert.match(csv, /Delivery percent,50/);
  assert.match(csv, /Make-good credit,200/);
});

test("planMakeGood is exported for direct use", () => {
  const out = planMakeGood(10000, 8000, 500, MAKEGOOD_POLICIES.prorata);
  assert.equal(out.credit, 100);
  assert.equal(out.deliveryPercent, 80);
});
