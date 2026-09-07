"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { planPromo, promoToCsv } = require("../src/promo.js");

describe("planPromo", () => {
  it("prices discount cost and brand net after a flat fee", () => {
    const r = planPromo({
      flatFee: "1,000",
      redemptions: "40",
      aov: "50",
      discountPercent: "20",
    });
    assert.equal(r.ok, true);
    assert.equal(r.grossRevenue, 2000);
    assert.equal(r.discountCost, 400);
    assert.equal(r.netRevenue, 1600);
    assert.equal(r.brandNetAfterFlat, 600);
    assert.equal(r.cpaOnGross, 25);
    assert.equal(r.effectiveRoas, 1.6);
    assert.equal(r.comparison, "no_affiliate");
  });

  it("flags when an affiliate percent would have been cheaper", () => {
    const r = planPromo({
      flatFee: "$2,000",
      redemptions: "100",
      aov: "40",
      discountPercent: "10%",
      affiliatePercent: "10%",
    });
    assert.equal(r.ok, true);
    assert.equal(r.grossRevenue, 4000);
    assert.equal(r.affiliatePayout, 400);
    assert.equal(r.comparison, "affiliate_cheaper");
    assert.equal(r.brandNetAfterAffiliate, 3200);
  });

  it("flags when the flat fee is cheaper than affiliate", () => {
    const r = planPromo({
      flatFee: "200",
      redemptions: "100",
      aov: "40",
      discountPercent: "0",
      affiliatePercent: "10",
    });
    assert.equal(r.ok, true);
    assert.equal(r.affiliatePayout, 400);
    assert.equal(r.comparison, "flat_cheaper");
  });

  it("ties when payouts match", () => {
    const r = planPromo({
      flatFee: "400",
      redemptions: "100",
      aov: "40",
      discountPercent: "0",
      affiliatePercent: "10",
    });
    assert.equal(r.ok, true);
    assert.equal(r.comparison, "tie");
  });

  it("rejects a discount above 100 percent", () => {
    const r = planPromo({
      flatFee: "100",
      redemptions: "1",
      aov: "10",
      discountPercent: "150",
    });
    assert.equal(r.ok, false);
    assert.match(r.errors.join(" "), /0 and 100/);
  });

  it("rejects an affiliate rate above 50 percent", () => {
    const r = planPromo({
      flatFee: "100",
      redemptions: "1",
      aov: "10",
      discountPercent: "10",
      affiliatePercent: "80",
    });
    assert.equal(r.ok, false);
    assert.match(r.errors.join(" "), /0 and 50/);
  });

  it("rejects fractional redemptions", () => {
    const r = planPromo({
      flatFee: "100",
      redemptions: "1.5",
      aov: "10",
      discountPercent: "10",
    });
    assert.equal(r.ok, false);
  });

  it("requires a flat fee", () => {
    const r = planPromo({
      redemptions: "1",
      aov: "10",
      discountPercent: "10",
    });
    assert.equal(r.ok, false);
  });
});

describe("promoToCsv", () => {
  it("neutralizes formula-like cells", () => {
    const r = planPromo({
      flatFee: "100",
      redemptions: "2",
      aov: "10",
      discountPercent: "0",
    });
    r.comparison = "=CMD()";
    const csv = promoToCsv(r);
    assert.match(csv, /Gross revenue/);
    assert.match(csv, /'=CMD\(\)/);
  });
});
