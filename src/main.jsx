import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Provider } from "react-redux"
import { store } from '../redux/store.js'

ReactDOM.createRoot(document.getElementById('root')).render(
    <Provider store={store}>
      <App />
    </Provider>
)

// The service worker is registered by vite-plugin-pwa (registerType: autoUpdate).
// The old CRA unregister() call was removed — it was tearing that SW down on
// every load (register→unregister churn) and disabling the PWA's offline cache.

