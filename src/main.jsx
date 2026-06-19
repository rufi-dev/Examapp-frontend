import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import 'katex/dist/katex.min.css'
import { Provider } from "react-redux"
import { store } from '../redux/store.js'
import { toast } from "react-toastify"

// Dedupe toasts globally: when many requests fail at once (e.g. an auth error
// cascade), the SAME message would otherwise stack into a screen-filling flood.
// Giving each message a toastId derived from its text makes react-toastify show
// it once. Applied here (once, before render) so every toast.x() call benefits
// without touching the ~70 call sites. Falls back silently if the API changes.
try {
    ;["error", "info", "warn", "warning", "success"].forEach((type) => {
        const orig = toast[type]
        if (typeof orig !== "function") return
        const bound = orig.bind(toast)
        toast[type] = (content, options = {}) =>
            bound(content, {
                toastId: typeof content === "string" ? `${type}:${content}` : options.toastId,
                ...options,
            })
    })
} catch {
    /* keep default toast behavior */
}

// Auto-recover from stale lazy-chunks after a deploy. Every build gives chunks
// new hashed filenames; a browser/service-worker still holding the OLD
// index.html requests an old chunk that no longer exists, and Vercel's SPA
// rewrite answers with index.html (MIME text/html), so the dynamic import fails
// and the route renders blank.
//
// A plain reload ISN'T enough: the stale PWA service worker keeps serving the
// old precached shell, so the reload hits the same dead chunk hashes — which is
// why it used to take several manual refreshes. So we UNREGISTER the service
// worker and CLEAR its caches first, then reload once: that forces a fresh fetch
// of the current index.html + chunk hashes from the network. The SW re-registers
// itself on the clean load.
const recoverFromStaleChunk = () => {
    try {
        const KEY = "__chunkReloadAt"
        if (Date.now() - Number(sessionStorage.getItem(KEY) || 0) < 15000) return // don't loop
        sessionStorage.setItem(KEY, String(Date.now()))
    } catch {
        /* sessionStorage unavailable -> still reload once below */
    }
    let reloaded = false
    const reloadOnce = () => {
        if (reloaded) return
        reloaded = true
        window.location.reload()
    }
    try {
        const tasks = []
        if ("serviceWorker" in navigator) {
            tasks.push(
                navigator.serviceWorker
                    .getRegistrations()
                    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
                    .catch(() => {})
            )
        }
        if (typeof caches !== "undefined" && caches.keys) {
            tasks.push(
                caches
                    .keys()
                    .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
                    .catch(() => {})
            )
        }
        Promise.all(tasks).then(reloadOnce)
        // Never hang on cleanup — reload anyway shortly after.
        setTimeout(reloadOnce, 1500)
    } catch {
        reloadOnce()
    }
}
const looksLikeChunkError = (m) =>
    /dynamically imported module|module script|Importing a module script failed|Loading chunk/i.test(
        String(m || "")
    )
// Vite emits this when a preloaded dynamic import fails — the most reliable signal.
window.addEventListener("vite:preloadError", (e) => {
    e?.preventDefault?.()
    recoverFromStaleChunk()
})
window.addEventListener("unhandledrejection", (e) => {
    if (looksLikeChunkError(e?.reason?.message || e?.reason)) recoverFromStaleChunk()
})
// Capture phase: resource (script/link) load errors don't bubble.
window.addEventListener(
    "error",
    (e) => {
        const t = e?.target
        const src = t && (t.tagName === "SCRIPT" || t.tagName === "LINK") ? t.src || t.href || "" : ""
        if (looksLikeChunkError(e?.message) || /\/assets\/[^/]+\.(js|css)(\?|$)/.test(src)) {
            recoverFromStaleChunk()
        }
    },
    true
)

ReactDOM.createRoot(document.getElementById('root')).render(
    <Provider store={store}>
      <App />
    </Provider>
)

// The service worker is registered by vite-plugin-pwa (registerType: autoUpdate).
// The old CRA unregister() call was removed — it was tearing that SW down on
// every load (register→unregister churn) and disabling the PWA's offline cache.

