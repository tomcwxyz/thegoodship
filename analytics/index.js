export const PLAUSIBLE_SCRIPT_SRC = "https://plausible.io/js/pa-badROEgITdp9x-bTX69Ls.js";

export function isGoodShipHostname(hostname) {
  const normalised = String(hostname || "").toLowerCase();
  return normalised === "good-ship.co.uk" || normalised.endsWith(".good-ship.co.uk");
}

export function installGoodShipAnalytics({
  windowObject = globalThis.window,
  documentObject = globalThis.document,
  force = false,
} = {}) {
  if (!windowObject || !documentObject) return false;

  const hostname = windowObject.location?.hostname || "";
  if ((!force && !isGoodShipHostname(hostname)) || windowObject.__goodShipAnalyticsLoaded) {
    return false;
  }

  windowObject.__goodShipAnalyticsLoaded = true;
  windowObject.plausible = windowObject.plausible || function plausible() {
    (windowObject.plausible.q = windowObject.plausible.q || []).push(arguments);
  };
  windowObject.plausible.init = windowObject.plausible.init || function init(options) {
    windowObject.plausible.o = options || {};
  };

  if (!documentObject.querySelector("script[data-good-ship-plausible]")) {
    const script = documentObject.createElement("script");
    script.async = true;
    script.src = PLAUSIBLE_SCRIPT_SRC;
    script.dataset.goodShipPlausible = "true";
    documentObject.head.appendChild(script);
  }

  windowObject.plausible.init();
  return true;
}
