const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const Payout = require("../src/payout.js");
const Campaign = require("../src/campaign.js");
const Deal = require("../src/deal-math.js");

describe("planPayout", () => {
  it("splits 50/50 and keeps the remainder on the last milestone", () => {
    const r = Payout.planPayout({ fee: "100.01", policy: "fifty_fifty" });
    assert.equal(r.ok, true);
    assert.equal(r.milestones.length, 2);
    assert.equal(r.milestones[0].amount, 50.01);
    assert.equal(r.milestones[1].amount, 50);
    assert.equal(Math.round((r.milestones[0].amount + r.milestones[1].amount) * 100) / 100, 100.01);
  });

  it("applies 30/40/30 shares to a round fee", () => {
    const r = Payout.planPayout({ fee: 1000, policy: "thirty_forty_thirty" });
    assert.equal(r.ok, true);
    assert.equal(r.buckets.booking, 300);
    assert.equal(r.buckets.live, 400);
    assert.equal(r.buckets.window, 300);
  });

  it("dates booking 14 days before live and holdback 30 days after", () => {
    const r = Payout.planPayout({
      fee: 2000,
      policy: "thirty_forty_thirty",
      liveDate: "2026-10-15",
    });
    assert.equal(r.ok, true);
    assert.equal(r.milestones[0].date, "2026-10-01");
    assert.equal(r.milestones[1].date, "2026-10-15");
    assert.equal(r.milestones[2].date, "2026-11-14");
  });

  it("rejects a bad live date", () => {
    const r = Payout.planPayout({ fee: 100, liveDate: "2026-13-40" });
    assert.equal(r.ok, false);
  });

  it("rejects a missing fee", () => {
    const r = Payout.planPayout({ policy: "all_on_live" });
    assert.equal(r.ok, false);
  });

  it("net-30 puts the whole fee in the window bucket", () => {
    const r = Payout.planPayout({ fee: 750, policy: "net30_live", liveDate: "2026-01-01" });
    assert.equal(r.ok, true);
    assert.equal(r.buckets.window, 750);
    assert.equal(r.milestones[0].date, "2026-01-31");
  });
});

describe("planCampaignPayouts", () => {
  it("uses quoted fees when present and suggested mid otherwise", () => {
    const csv =
      "handle,expected_views,quoted_fee,niche,format\n" +
      "alpha,100000,2000,lifestyle,integration\n" +
      "beta,50000,,lifestyle,integration\n";
    const campaign = Campaign.planCampaign(csv, Deal.planDeal.bind(Deal));
    assert.equal(campaign.ok, true);
    const payout = Payout.planCampaignPayouts(campaign, { policy: "fifty_fifty" });
    assert.equal(payout.ok, true);
    assert.equal(payout.creators[0].feeSource, "quoted");
    assert.equal(payout.creators[0].fee, 2000);
    assert.equal(payout.creators[1].feeSource, "suggested_mid");
    assert.equal(payout.totals.booking + payout.totals.live + payout.totals.window, payout.totals.fee);
  });

  it("fails without a priced slate", () => {
    const payout = Payout.planCampaignPayouts({ ok: false });
    assert.equal(payout.ok, false);
  });
});

describe("payoutToCsv", () => {
  it("neutralizes formula-like handles", () => {
    const r = Payout.planPayout({ fee: 10, policy: "all_on_live" });
    r.milestones[0].label = "=CMD";
    const csv = Payout.payoutToCsv(r);
    assert.match(csv, /'=CMD/);
  });
});
