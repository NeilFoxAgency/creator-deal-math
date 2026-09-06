/**
 * Injects an optional agency-commission panel.
 * DOM-only. No innerHTML. No network.
 */
(function () {
  "use strict";
  if (typeof document === "undefined" || !window.CommissionMath) return;

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
    if (n == null || Number.isNaN(n)) return "\u2014";
    return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  function mount() {
    if (document.getElementById("commissionPanel")) return;
    const form = document.getElementById("dealForm");
    if (!form) return;
    const details = el("details", { id: "commissionPanel" });
    details.appendChild(el("summary", null, "Agency commission (optional)"));
    details.appendChild(
      el(
        "p",
        { class: "hint" },
        "Split a quoted fee into creator net, agency fee, and brand cash-out. Uses the quoted fee, or the last priced slate. Not an MSA."
      )
    );

    const rateLabel = el("label", { for: "commissionPercent" }, "Commission percent");
    const rate = el("input", {
      id: "commissionPercent",
      inputmode: "decimal",
      placeholder: "15",
      "aria-label": "Commission percent",
    });
    details.appendChild(rateLabel);
    details.appendChild(rate);

    const modelLabel = el("label", { for: "commissionModel" }, "Who pays");
    const model = el("select", { id: "commissionModel", "aria-label": "Commission model" });
    Object.keys(window.CommissionMath.MODELS).forEach(function (key) {
      const opt = el("option", { value: key }, window.CommissionMath.MODELS[key].label);
      model.appendChild(opt);
    });
    details.appendChild(modelLabel);
    details.appendChild(model);

    const actions = el("p");
    const btn = el("button", { type: "button", id: "commissionRun" }, "Split commission");
    const csvBtn = el("button", { type: "button", id: "commissionCsv" }, "Download commission CSV");
    actions.appendChild(btn);
    actions.appendChild(csvBtn);
    details.appendChild(actions);
    const status = el("p", { id: "commissionStatus", role: "status" });
    details.appendChild(status);
    const out = el("div", { id: "commissionResults", hidden: true });
    details.appendChild(out);

    const payout = document.getElementById("payoutPanel");
    if (payout && payout.parentNode) {
      payout.parentNode.insertBefore(details, payout.nextSibling);
    } else {
      const campaign = document.getElementById("campaignPanel");
      if (campaign && campaign.parentNode) {
        campaign.parentNode.insertBefore(details, campaign.nextSibling);
      } else {
        form.parentNode.insertBefore(details, form.nextSibling);
      }
    }

    let last = null;

    btn.addEventListener("click", function () {
      const opts = { percent: rate.value, model: model.value };
      const slate = window.__lastCampaignResult || null;
      let result;
      if (slate && slate.ok) {
        result = window.CommissionMath.planCampaignCommission(slate, opts);
      } else {
        const feeEl = document.getElementById("quotedFee");
        result = window.CommissionMath.planCommission({
          fee: feeEl ? feeEl.value : "",
          percent: opts.percent,
          model: opts.model,
        });
      }
      last = result;
      out.textContent = "";
      if (!result.ok) {
        status.textContent = result.errors.join(" ");
        out.hidden = true;
        return;
      }
      status.textContent = result.creators
        ? "Slate commission split from priced rows."
        : "Single-deal commission split from the quoted fee.";
      const list = el("ul");
      if (result.totals) {
        [
          "Creators: " + result.totals.creatorCount,
          "Quoted / suggested total: " + money(result.totals.quotedFee),
          "Agency fee: " + money(result.totals.agencyFee),
          "Creator net: " + money(result.totals.creatorNet),
          "Brand cash-out: " + money(result.totals.brandTotal),
        ].forEach(function (line) {
          list.appendChild(el("li", null, line));
        });
      } else {
        list.appendChild(el("li", null, result.modelLabel));
        list.appendChild(el("li", null, "Quoted fee: " + money(result.quotedFee)));
        list.appendChild(el("li", null, "Agency fee: " + money(result.agencyFee)));
        list.appendChild(el("li", null, "Creator net: " + money(result.creatorNet)));
        list.appendChild(el("li", null, "Brand cash-out: " + money(result.brandTotal)));
      }
      out.appendChild(list);
      if (result.creators) {
        const table = el("table");
        const thead = el("thead");
        const hr = el("tr");
        ["Handle", "Quoted", "Agency", "Creator net", "Brand"].forEach(function (h) {
          hr.appendChild(el("th", { scope: "col" }, h));
        });
        thead.appendChild(hr);
        table.appendChild(thead);
        const tb = el("tbody");
        result.creators.forEach(function (c) {
          const tr = el("tr");
          [c.handle, money(c.quotedFee), money(c.agencyFee), money(c.creatorNet), money(c.brandTotal)].forEach(
            function (v) {
              tr.appendChild(el("td", null, v));
            }
          );
          tb.appendChild(tr);
        });
        table.appendChild(tb);
        out.appendChild(table);
      }
      out.hidden = false;
    });

    csvBtn.addEventListener("click", function () {
      if (!last || !last.ok) {
        status.textContent = "Split commission before exporting.";
        return;
      }
      const blob = new Blob([window.CommissionMath.commissionToCsv(last)], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "creator-commission-split.csv";
      a.click();
      URL.revokeObjectURL(url);
      status.textContent = "Commission CSV downloaded. Formula-like cells are neutralized.";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
