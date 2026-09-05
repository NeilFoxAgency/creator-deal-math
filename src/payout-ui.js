/**
 * Injects an optional payout-milestone panel.
 * DOM-only. No innerHTML. No network.
 */
(function () {
  "use strict";
  if (typeof document === "undefined" || !window.PayoutMath) return;

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
    if (document.getElementById("payoutPanel")) return;
    const form = document.getElementById("dealForm");
    if (!form) return;
    const details = el("details", { id: "payoutPanel" });
    details.appendChild(el("summary", null, "Payout milestones (optional)"));
    details.appendChild(
      el(
        "p",
        { class: "hint" },
        "Sketch when cash leaves the brand. Uses the quoted fee on the form, or the last priced slate if you ran Campaign slate. Not invoice terms."
      )
    );

    const policyLabel = el("label", { for: "payoutPolicy" }, "Schedule");
    const policy = el("select", { id: "payoutPolicy", "aria-label": "Payout schedule" });
    Object.keys(window.PayoutMath.POLICIES).forEach(function (key) {
      const opt = el("option", { value: key }, window.PayoutMath.POLICIES[key].label);
      policy.appendChild(opt);
    });
    details.appendChild(policyLabel);
    details.appendChild(policy);

    const dateLabel = el("label", { for: "payoutLiveDate" }, "Planned live date (optional)");
    const dateInput = el("input", {
      id: "payoutLiveDate",
      type: "date",
      "aria-label": "Planned live date",
    });
    details.appendChild(dateLabel);
    details.appendChild(dateInput);

    const actions = el("p");
    const btn = el("button", { type: "button", id: "payoutRun" }, "Plan payouts");
    const csvBtn = el("button", { type: "button", id: "payoutCsv" }, "Download payout CSV");
    actions.appendChild(btn);
    actions.appendChild(csvBtn);
    details.appendChild(actions);
    const status = el("p", { id: "payoutStatus", role: "status" });
    details.appendChild(status);
    const out = el("div", { id: "payoutResults", hidden: true });
    details.appendChild(out);

    const campaign = document.getElementById("campaignPanel");
    if (campaign && campaign.parentNode) {
      campaign.parentNode.insertBefore(details, campaign.nextSibling);
    } else {
      form.parentNode.insertBefore(details, form.nextSibling);
    }

    let last = null;

    function lastCampaign() {
      return window.__lastCampaignResult || null;
    }

    btn.addEventListener("click", function () {
      const opts = { policy: policy.value, liveDate: dateInput.value };
      const slate = lastCampaign();
      let result;
      if (slate && slate.ok) {
        result = window.PayoutMath.planCampaignPayouts(slate, opts);
      } else {
        const feeEl = document.getElementById("quotedFee");
        result = window.PayoutMath.planPayout({
          fee: feeEl ? feeEl.value : "",
          policy: opts.policy,
          liveDate: opts.liveDate,
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
        ? "Slate cash-flow sketched from priced rows."
        : "Single-deal cash-flow sketched from the quoted fee.";
      const list = el("ul");
      if (result.totals) {
        [
          "Creators: " + result.totals.creatorCount,
          "Total fee: " + money(result.totals.fee),
          "Booking bucket: " + money(result.totals.booking),
          "Live bucket: " + money(result.totals.live),
          "Post-window bucket: " + money(result.totals.window),
        ].forEach(function (line) {
          list.appendChild(el("li", null, line));
        });
      } else {
        list.appendChild(el("li", null, "Fee: " + money(result.fee)));
        list.appendChild(el("li", null, result.policyLabel));
      }
      out.appendChild(list);
      const table = el("table");
      const thead = el("thead");
      const hr = el("tr");
      const headers = result.creators
        ? ["Handle", "Milestone", "Amount", "Date"]
        : ["Milestone", "Amount", "Date"];
      headers.forEach(function (h) {
        hr.appendChild(el("th", { scope: "col" }, h));
      });
      thead.appendChild(hr);
      table.appendChild(thead);
      const tb = el("tbody");
      function addRow(cells) {
        const tr = el("tr");
        cells.forEach(function (v) {
          tr.appendChild(el("td", null, v));
        });
        tb.appendChild(tr);
      }
      if (result.creators) {
        result.creators.forEach(function (c) {
          c.milestones.forEach(function (m) {
            addRow([c.handle, m.label, money(m.amount), m.date || "—"]);
          });
        });
      } else {
        result.milestones.forEach(function (m) {
          addRow([m.label, money(m.amount), m.date || "—"]);
        });
      }
      table.appendChild(tb);
      out.appendChild(table);
      out.hidden = false;
    });

    csvBtn.addEventListener("click", function () {
      if (!last || !last.ok) {
        status.textContent = "Plan payouts before exporting.";
        return;
      }
      const blob = new Blob([window.PayoutMath.payoutToCsv(last)], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "creator-payout-milestones.csv";
      a.click();
      URL.revokeObjectURL(url);
      status.textContent = "Payout CSV downloaded. Formula-like cells are neutralized.";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
