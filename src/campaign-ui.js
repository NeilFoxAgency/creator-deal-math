/**
 * Injects an optional campaign-slate panel into index.html.
 * DOM-only. No innerHTML. No network.
 */
(function () {
  "use strict";
  if (typeof document === "undefined" || !window.CampaignMath) return;

  function el(tag, attrs, text) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "hidden") node.hidden = !!attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (text != null) node.textContent = text;
    return node;
  }

  function money(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  function mount() {
    const form = document.getElementById("dealForm");
    if (!form || document.getElementById("campaignPanel")) return;
    const details = el("details", { id: "campaignPanel" });
    const summary = el("summary", null, "Campaign slate (optional)");
    details.appendChild(summary);
    details.appendChild(
      el(
        "p",
        { class: "hint" },
        "Paste a header plus one creator per line. Required: handle, expected_views. Optional: quoted_fee, niche, format, usage, exclusivity. Max 40 rows. Labels only — no emails."
      )
    );
    const area = el("textarea", {
      id: "campaignRoster",
      rows: "8",
      cols: "72",
      spellcheck: "false",
      "aria-label": "Campaign roster CSV",
    });
    area.placeholder =
      "handle,expected_views,quoted_fee,niche,format\ngreta-cooks,180000,4200,lifestyle,integration\ntech-sam,90000,3100,tech,dedicated";
    details.appendChild(area);
    const actions = el("p");
    const btn = el("button", { type: "button", id: "campaignRun" }, "Price slate");
    const csvBtn = el("button", { type: "button", id: "campaignCsv" }, "Download slate CSV");
    actions.appendChild(btn);
    actions.appendChild(csvBtn);
    details.appendChild(actions);
    const status = el("p", { id: "campaignStatus", role: "status" });
    details.appendChild(status);
    const out = el("div", { id: "campaignResults", hidden: true });
    details.appendChild(out);
    form.parentNode.insertBefore(details, form.nextSibling);

    let last = null;

    btn.addEventListener("click", function () {
      const planDeal =
        window.DealMath && typeof window.DealMath.planDeal === "function"
          ? window.DealMath.planDeal.bind(window.DealMath)
          : null;
      if (!planDeal) {
        status.textContent = "Deal math is not loaded.";
        return;
      }
      const result = window.CampaignMath.planCampaign(area.value, planDeal);
      last = result;
      window.__lastCampaignResult = result;
      out.textContent = "";
      if (!result.ok) {
        status.textContent = result.errors.join(" ");
        out.hidden = true;
        return;
      }
      status.textContent = result.errors.length
        ? "Priced with notes: " + result.errors.join(" ")
        : "Slate priced. Totals are independent row sums.";
      const t = result.totals;
      const list = el("ul");
      [
        "Creators: " + t.creatorCount,
        "Expected views: " + t.expectedViews.toLocaleString("en-US"),
        "Suggested mid total: " + money(t.suggestedMid),
        "Quoted total: " + money(t.quotedFee),
        "Blended implied CPM: " + (t.blendedImpliedCpm == null ? "—" : "$" + t.blendedImpliedCpm),
        "Largest spend share: @" + t.topHandle + " (" + Math.round(t.topSpendShare * 100) + "%)",
      ].forEach(function (line) {
        list.appendChild(el("li", null, line));
      });
      if (t.concentrationWarning) {
        list.appendChild(
          el(
            "li",
            null,
            "Concentration: one creator is 45%+ of slate spend. That is a planning flag, not a reject."
          )
        );
      }
      out.appendChild(list);
      const table = el("table");
      const thead = el("thead");
      const hr = el("tr");
      ["Handle", "Views", "Quote", "Suggested mid", "Position"].forEach(function (h) {
        hr.appendChild(el("th", { scope: "col" }, h));
      });
      thead.appendChild(hr);
      table.appendChild(thead);
      const tb = el("tbody");
      result.creators.forEach(function (c) {
        const tr = el("tr");
        [c.handle, String(c.expectedViews), money(c.quotedFee), money(c.suggestedMid), c.quotePosition || "—"].forEach(
          function (v) {
            tr.appendChild(el("td", null, v));
          }
        );
        tb.appendChild(tr);
      });
      table.appendChild(tb);
      out.appendChild(table);
      out.hidden = false;
    });

    csvBtn.addEventListener("click", function () {
      if (!last || !last.ok) {
        status.textContent = "Price the slate before exporting.";
        return;
      }
      const blob = new Blob([window.CampaignMath.campaignToCsv(last)], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "creator-campaign-slate.csv";
      a.click();
      URL.revokeObjectURL(url);
      status.textContent = "Slate CSV downloaded. Formula-like cells are neutralized.";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
