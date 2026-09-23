import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// iOS Safari/WKWebView ignores user-scalable=no; block its page pinch-zoom
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)