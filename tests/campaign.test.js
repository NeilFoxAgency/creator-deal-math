"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const deal = require("../src/deal-math.js");
const campaign = require("../src/campaign.js");

const SAMPLE = [
  "handle,expected_views,quoted_fee,niche,format",
  "greta-cooks,180000,4200,lifestyle,integration",
  "tech-sam,90000,3100,tech,dedicated",
].join("\n");

describe("parseRoster", () => {
  it("reads a header plus creator rows", () => {
    const parsed = campaign.parseRoster(SAMPLE);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[0].handle, "greta-cooks");
    assert.equal(parsed.rows[1].format, "dedicated");
  });

  it("strips a leading @ and accepts creator/views aliases", () => {
    const text = "creator,views\n@Ada,10000";
    const parsed = campaign.parseRoster(text);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.rows[0].handle, "Ada");
    assert.equal(parsed.rows[0].expectedViews, "10000");
  });

  it("rejects an empty paste and a header-only paste", () => {
    assert.equal(campaign.parseRoster("").ok, false);
    assert.equal(campaign.parseRoster("handle,expected_views\n").ok, false);
  });

  it("rejects duplicate handles case-insensitively", () => {
    const text = "handle,expected_views\nSam,10\nsam,20";
    const parsed = campaign.parseRoster(text);
    assert.ok(parsed.errors.some((e) => /Duplicate/.test(e)));
  });
});

describe("planCampaign", () => {
  it("sums suggested fees and views across independent rows", () => {
    const result = campaign.planCampaign(SAMPLE, deal.planDeal);
    assert.equal(result.ok, true);
    assert.equal(result.creators.length, 2);
    assert.equal(result.totals.expectedViews, 270000);
    assert.equal(result.totals.quotedFee, 7300);
    const greta = deal.planDeal({
      expectedViews: 180000,
      quotedFee: 4200,
      niche: "lifestyle",
      format: "integration",
    });
    const sam = deal.planDeal({
      expectedViews: 90000,
      quotedFee: 3100,
      niche: "tech",
      format: "dedicated",
    });
    assert.equal(
      result.totals.suggestedMid,
      Math.round((greta.suggested.mid + sam.suggested.mid) * 100) / 100
    );
    assert.equal(result.totals.blendedImpliedCpm, Math.round((7300 / 270000) * 1000 * 100) / 100);
  });

  it("warns when one creator is 45% or more of quoted spend", () => {
    const text = [
      "handle,expected_views,quoted_fee,niche,format",
      "anchor,200000,9000,lifestyle,integration",
      "support,40000,1000,lifestyle,integration",
    ].join("\n");
    const result = campaign.planCampaign(text, deal.planDeal);
    assert.equal(result.ok, true);
    assert.equal(result.totals.topHandle, "anchor");
    assert.equal(result.totals.concentrationWarning, true);
    assert.ok(result.totals.topSpendShare >= 0.45);
  });

  it("does not warn when no creator reaches 45% of spend", () => {
    const text = [
      "handle,expected_views,quoted_fee,niche,format",
      "one,80000,2000,lifestyle,integration",
      "two,80000,1800,lifestyle,integration",
      "three,80000,1700,lifestyle,integration",
    ].join("\n");
    const result = campaign.planCampaign(text, deal.planDeal);
    assert.equal(result.totals.concentrationWarning, false);
    assert.ok(result.totals.topSpendShare < 0.45);
  });

  it("keeps single-deal planDeal unchanged (no wrap)", () => {
    const solo = deal.planDeal({ expectedViews: 10000, niche: "lifestyle", format: "integration" });
    assert.equal(solo.ok, true);
    assert.equal(solo.suggested.mid, deal.feeFromCpm(10000, deal.NICHE_CPM.lifestyle.mid, 1));
  });
});

describe("campaignToCsv", () => {
  it("neutralizes formula-like handles", () => {
    const text = "handle,expected_views,quoted_fee\n=1+1,10000,500";
    const result = campaign.planCampaign(text, deal.planDeal);
    assert.equal(result.ok, true);
    const csv = campaign.campaignToCsv(result);
    assert.match(csv, /'=1\+1/);
    assert.match(csv, /total_suggested_mid/);
  });
});
