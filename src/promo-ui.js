/**
 * Injects an optional discount-code attribution panel.
 * DOM-only. No innerHTML. No network.
 */
(function () {
  "use strict";
  if (typeof document === "undefined" || !window.PromoMath) return;

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
    if (document.getElementById("promoPanel")) return;
    const form = document.getElementById("dealForm");
    if (!form) return;
    const details = el("details", { id: "promoPanel" });
    details.appendChild(el("summary", null, "Discount code vs flat fee (optional)"));
    details.appendChild(
      el(
        "p",
        { class: "hint" },
        "Compare unique-code redemptions against the quoted flat fee and an optional affiliate percent. Uses numbers you type. Does not connect to a store."
      )
    );

    function field(id, labelText, placeholder) {
      details.appendChild(el("label", { for: id }, labelText));
      const input = el("input", {
        id: id,
        inputmode: "decimal",
        placeholder: placeholder,
        "aria-label": labelText,
      });
      details.appendChild(input);
      return input;
    }

    const fee = field("promoFlatFee", "Flat fee", "1500");
    const redemptions = field("promoRedemptions", "Code redemptions", "40");
    const aov = field("promoAov", "Average order value", "40");
    const discount = field("promoDiscount", "Discount percent on the code", "15");
    const affiliate = field("promoAffiliate", "Affiliate percent to compare (optional)", "10");

    const actions = el("p");
    const btn = el("button", { type: "button", id: "promoRun" }, "Compare code vs fee");
    const csvBtn = el("button", { type: "button", id: "promoCsv" }, "Download promo CSV");
    actions.appendChild(btn);
    actions.appendChild(csvBtn);
    details.appendChild(actions);
    const status = el("p", { id: "promoStatus", role: "status" });
    details.appendChild(status);
    const out = el("div", { id: "promoResults", hidden: true });
    details.appendChild(out);

    const commission = document.getElementById("commissionPanel");
    if (commission && commission.parentNode) {
      commission.parentNode.insertBefore(details, commission.nextSibling);
    } else {
      form.parentNode.insertBefore(details, form.nextSibling);
    }

    let last = null;

    btn.addEventListener("click", function () {
      const quotedNow = document.getElementById("quotedFee");
      const result = window.PromoMath.planPromo({
        flatFee: fee.value || (quotedNow ? quotedNow.value : ""),
        redemptions: redemptions.value,
        aov: aov.value,
        discountPercent: discount.value,
        affiliatePercent: affiliate.value,
      });
      last = result;
      out.textContent = "";
      if (!result.ok) {
        status.textContent = result.errors.join(" ");
        out.hidden = true;
        return;
      }
      status.textContent = "Promo comparison calculated locally.";
      const list = el("ul");
      [
        "Gross revenue from code: " + money(result.grossRevenue),
        "Discount cost: " + money(result.discountCost),
        "Net revenue after discount: " + money(result.netRevenue),
        "Brand net after flat fee: " + money(result.brandNetAfterFlat),
        "CPA on redemptions: " + money(result.cpaOnGross),
        "Effective ROAS on net revenue: " +
          (result.effectiveRoas == null ? "\u2014" : result.effectiveRoas + "x"),
        result.affiliatePayout == null
          ? "Affiliate comparison skipped (no percent entered)."
          : "Affiliate payout at " + result.affiliatePercent + "%: " + money(result.affiliatePayout),
        result.comparisonLabel,
      ].forEach(function (line) {
        list.appendChild(el("li", null, line));
      });
      out.appendChild(list);
      out.hidden = false;
    });

    csvBtn.addEventListener("click", function () {
      if (!last || !last.ok) {
        status.textContent = "Compare the code before exporting.";
        return;
      }
      const blob = new Blob([window.PromoMath.promoToCsv(last)], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "creator-promo-comparison.csv";
      a.click();
      URL.revokeObjectURL(url);
      status.textContent = "Promo CSV downloaded. Formula-like cells are neutralized.";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
