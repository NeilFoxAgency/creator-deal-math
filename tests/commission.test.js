"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  planCommission,
  planCampaignCommission,
  commissionToCsv,
} = require("../src/commission.js");

describe("planCommission", () => {
  it("adds markup on the brand when the creator keeps the quoted fee", () => {
    const r = planCommission({ fee: "1000", percent: "15", model: "brand_markup" });
    assert.equal(r.ok, true);
    assert.equal(r.agencyFee, 150);
    assert.equal(r.creatorNet, 1000);
    assert.equal(r.brandTotal, 1150);
    assert.equal(r.withheldFromCreator, 0);
  });

  it("withholds from the creator when the brand pays the quoted fee", () => {
    const r = planCommission({ fee: "$2,000", percent: "20%", model: "creator_withhold" });
    assert.equal(r.ok, true);
    assert.equal(r.agencyFee, 400);
    assert.equal(r.creatorNet, 1600);
    assert.equal(r.brandTotal, 2000);
    assert.equal(r.brandMarkup, 0);
  });

  it("splits commission so parts still add up after odd cents", () => {
    const r = planCommission({ fee: "100", percent: "15", model: "split_even" });
    assert.equal(r.ok, true);
    assert.equal(r.agencyFee, 15);
    assert.equal(r.brandMarkup + r.withheldFromCreator, 15);
    assert.equal(r.creatorNet + r.withheldFromCreator, 100);
    assert.equal(r.brandTotal, 100 + r.brandMarkup);
  });

  it("rejects a rate above 50 percent", () => {
    const r = planCommission({ fee: "1000", percent: "60", model: "brand_markup" });
    assert.equal(r.ok, false);
    assert.match(r.errors.join(" "), /0 and 50/);
  });

  it("requires a fee", () => {
    const r = planCommission({ percent: "15" });
    assert.equal(r.ok, false);
  });
});

describe("planCampaignCommission", () => {
  const slate = {
    ok: true,
    creators: [
      { handle: "ada", quotedFee: 1000, suggestedMid: 900 },
      { handle: "grace", quotedFee: null, suggestedMid: 500 },
    ],
  };

  it("uses quoted fee when present and mid otherwise", () => {
    const r = planCampaignCommission(slate, { percent: "10", model: "brand_markup" });
    assert.equal(r.ok, true);
    assert.equal(r.creators[0].feeSource, "quoted");
    assert.equal(r.creators[1].feeSource, "suggested_mid");
    assert.equal(r.totals.quotedFee, 1500);
    assert.equal(r.totals.agencyFee, 150);
    assert.equal(r.totals.brandTotal, 1650);
  });

  it("fails closed without a priced slate", () => {
    const r = planCampaignCommission({ ok: false }, { percent: "10" });
    assert.equal(r.ok, false);
  });
});

describe("commissionToCsv", () => {
  it("neutralizes formula-like cells", () => {
    const r = planCommission({ fee: "100", percent: "10", model: "brand_markup" });
    r.modelLabel = "=HYPERLINK(1)";
    const csv = commissionToCsv({
      ok: true,
      quotedFee: r.quotedFee,
      agencyFee: r.agencyFee,
      creatorNet: r.creatorNet,
      brandTotal: r.brandTotal,
    });
    assert.match(csv, /quoted_fee/);
    assert.match(csv, /deal,quoted,100,10,100,110/);
  });
});
