import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Инициализация Telegram WebApp
const tg = (window as any).Telegram?.WebApp
if (tg) {
  tg.ready()
  tg.expand() // Развернуть на весь экран
  tg.setBackgroundColor('#0E051A')
  tg.setHeaderColor('#0E051A')
}

// Принудительно ставим фон через JS
document.body.style.backgroundColor = '#0E051A'
document.documentElement.style.backgroundColor = '#0E051A'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)