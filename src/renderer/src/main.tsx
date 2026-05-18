import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import { ThemeProvider } from './app/ThemeContext'
import { initRendererLogger } from './shared/lib/rendererLogger'
import './app/global.css'

initRendererLogger()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
