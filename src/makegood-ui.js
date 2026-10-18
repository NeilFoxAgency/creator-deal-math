/**
 * Browser-only wiring for make-good planning. No network.
 */
"use strict";

(function () {
  var math = window.DealMath;
  if (!math) return;

  function ensurePolicySelect() {
    if (document.getElementById("makegoodPolicy")) return;
    var actual = document.getElementById("actualViews");
    if (!actual || !actual.parentNode) return;
    var label = document.createElement("label");
    label.setAttribute("for", "makegoodPolicy");
    label.appendChild(document.createTextNode("Make-good policy"));
    var tip = document.createElement("span");
    tip.className = "tip";
    tip.textContent = "Planning helper after actual views land. Not contract language.";
    label.appendChild(tip);
    var select = document.createElement("select");
    select.id = "makegoodPolicy";
    select.name = "makegoodPolicy";
    Object.keys(math.MAKEGOOD_POLICIES).forEach(function (key) {
      var opt = document.createElement("option");
      opt.value = key;
      opt.textContent = math.MAKEGOOD_POLICIES[key].label;
      select.appendChild(opt);
    });
    select.value = "report";
    actual.insertAdjacentElement("afterend", select);
    actual.insertAdjacentElement("afterend", label);
    var tipActual = actual.previousElementSibling;
    if (tipActual && tipActual.tagName === "LABEL") {
      var innerTip = tipActual.querySelector(".tip");
      if (innerTip) innerTip.textContent = "Used for delivered CPM and make-good planning. Often 30 days.";
    }
  }

  var innerPlan = math.planDeal.bind(math);
  math.planDeal = function (raw) {
    raw = raw || {};
    var el = document.getElementById("makegoodPolicy");
    if (!raw.makegoodPolicy && el) raw.makegoodPolicy = el.value;
    var result = innerPlan(raw);
    math._lastMakegood = result && result.ok ? result.makegood : null;
    return result;
  };
  window.DealMath = math;

  function money(n) {
    if (n == null) return "-";
    return "$" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function appendCards() {
    var box = document.getElementById("result");
    var mg = math._lastMakegood;
    if (!box || box.hidden || !mg) return;
    if (box.querySelector("[data-makegood='1']")) return;
    var grid = box.querySelector(".grid");
    if (!grid) return;
    function card(label, value) {
      var div = document.createElement("div");
      div.className = "card";
      div.setAttribute("data-makegood", "1");
      var k = document.createElement("span");
      k.className = "tip";
      k.textContent = label;
      var v = document.createElement("strong");
      v.textContent = value;
      div.appendChild(k);
      div.appendChild(v);
      return div;
    }
    grid.appendChild(card("Delivery vs expected views", mg.present ? mg.deliveryPercent + "%" : "-"));
    grid.appendChild(
      card("View shortfall", mg.shortfallViews == null ? "-" : String(mg.shortfallViews))
    );
    grid.appendChild(card("Make-good readout", mg.label));
    grid.appendChild(card("Suggested make-good credit", money(mg.credit)));
  }

  document.addEventListener("DOMContentLoaded", function () {
    ensurePolicySelect();
    var form = document.getElementById("dealForm");
    if (form) {
      form.addEventListener("submit", function () {
        window.setTimeout(appendCards, 0);
      });
    }
  });
})();
