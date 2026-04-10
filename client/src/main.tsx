import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Инициализация Telegram WebApp
const tg = (window as any).Telegram?.WebApp
if (tg) {
  tg.ready()
  tg.expand() // Развернуть на весь экран
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)