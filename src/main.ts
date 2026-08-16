import { createApp } from 'vue'
import App from './App.vue'
import i18n from './i18n'
import './style.css'

// 在 Vue 挂载前从 localStorage 读取并应用主题，避免闪烁
const saved = localStorage.getItem('flowtick_settings')
if (saved) {
  try {
    const parsed = JSON.parse(saved)
    if (parsed && (parsed.theme === 'dark' || parsed.theme === 'light')) {
      document.documentElement.dataset.theme = parsed.theme
    }
  } catch {
    // ignore
  }
}

createApp(App).use(i18n).mount('#app')
