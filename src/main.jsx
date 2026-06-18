import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
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

ReactDOM.createRoot(document.getElementById('root')).render(
    <Provider store={store}>
      <App />
    </Provider>
)

// The service worker is registered by vite-plugin-pwa (registerType: autoUpdate).
// The old CRA unregister() call was removed — it was tearing that SW down on
// every load (register→unregister churn) and disabling the PWA's offline cache.

