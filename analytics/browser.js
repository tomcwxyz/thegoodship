(function installGoodShipAnalytics(window, document) {
  "use strict";

  var PLAUSIBLE_SCRIPT_SRC = "https://plausible.io/js/pa-badROEgITdp9x-bTX69Ls.js";
  var hostname = window.location && window.location.hostname ? window.location.hostname.toLowerCase() : "";
  var isGoodShip = hostname === "good-ship.co.uk" || hostname.endsWith(".good-ship.co.uk");

  // Do not record local development, Vercel previews, or unrelated hosts by default.
  if (!isGoodShip || window.__goodShipAnalyticsLoaded) return;
  window.__goodShipAnalyticsLoaded = true;

  window.plausible = window.plausible || function () {
    (window.plausible.q = window.plausible.q || []).push(arguments);
  };
  window.plausible.init = window.plausible.init || function (options) {
    window.plausible.o = options || {};
  };

  if (!document.querySelector('script[data-good-ship-plausible]')) {
    var script = document.createElement("script");
    script.async = true;
    script.src = PLAUSIBLE_SCRIPT_SRC;
    script.dataset.goodShipPlausible = "true";
    document.head.appendChild(script);
  }

  window.plausible.init();
})(window, document);
