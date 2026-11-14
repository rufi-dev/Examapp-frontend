/*
 * Early "open" beacon (ported from Examopia, 2026-11-14). Runs from index.html
 * <head> BEFORE the app bundle, so a visit is recorded the instant the HTML
 * loads — even if the visitor leaves before React paints. The app's tracker
 * (src/lib/visitorTracking.js) later sends "page_view" (rendered);
 * opened-but-not-rendered = a pre-render bounce. Shares the session id + first-
 * touch acquisition with the app tracker so it stays ONE visit row.
 */
(function () {
  try {
    var host = location.hostname;
    var API = (host === "localhost" || host === "127.0.0.1")
      ? "http://localhost:5000/api/track"
      : "https://api.bunkermath.az/api/track";

    var now = Date.now();
    var GAP = 30 * 60 * 1000;

    // Session id (same key/rules as the app tracker) so both beacons hit one row.
    var sid = sessionStorage.getItem("exq_vsid");
    var seen = Number(sessionStorage.getItem("exq_vts"));
    if (!sid || !isFinite(seen) || now - seen > GAP) {
      sid = now.toString(36) + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem("exq_vsid", sid);
      sessionStorage.removeItem("exq_vacq");
      sessionStorage.removeItem("exq_vlast");
    }
    sessionStorage.setItem("exq_vts", String(now));

    // First-touch acquisition (utm / ?ref / referring host), captured as early as
    // possible so the source survives all the way to sign-up.
    var acq = null;
    try { acq = JSON.parse(sessionStorage.getItem("exq_vacq") || "null"); } catch (e) { /* ignore */ }
    if (!acq) {
      var params = new URLSearchParams(location.search);
      var utm = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
        var v = params.get(k); if (v) utm[k] = v.slice(0, 200);
      });
      var affiliate = utm.utm_source || "";
      if (!affiliate) {
        var keys = ["ref", "aff", "affiliate", "affid", "aff_id", "partner", "pid", "source", "src", "fbclid", "gclid"];
        for (var i = 0; i < keys.length; i++) {
          var v = params.get(keys[i]);
          if (v) { affiliate = (keys[i] + ":" + v).slice(0, 200); break; }
        }
      }
      var referrer = document.referrer || "(direct)";
      if (!affiliate) {
        try { affiliate = (referrer && referrer !== "(direct)") ? new URL(referrer).hostname : "(direct)"; }
        catch (e) { affiliate = "(direct)"; }
      }
      acq = { landing: location.pathname, referrer: referrer, affiliate: affiliate, utm: utm };
      try { sessionStorage.setItem("exq_vacq", JSON.stringify(acq)); } catch (e) { /* ignore */ }
    }

    var body = JSON.stringify({
      ts: new Date().toISOString(),
      session_id: sid,
      event: "open",
      path: location.pathname,
      title: document.title,
      landing: acq.landing,
      referrer: acq.referrer,
      affiliate: acq.affiliate,
      utm: acq.utm,
      ua: navigator.userAgent
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(API, new Blob([body], { type: "text/plain;charset=utf-8" }));
    } else {
      fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body, keepalive: true, mode: "no-cors" });
    }
  } catch (e) { /* analytics must never break the page */ }
})();
