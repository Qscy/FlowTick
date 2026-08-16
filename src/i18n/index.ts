import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import enUS from './en-US'

const LOCALE_KEY = 'flowtick_locale'

function detectLocale(): string {
  // Check localStorage first
  const saved = localStorage.getItem(LOCALE_KEY)
  if (saved && (saved === 'zh-CN' || saved === 'en-US')) return saved

  // Auto-detect from browser language
  const lang = navigator.language || navigator.languages?.[0] || 'en-US'
  return lang.startsWith('zh') ? 'zh-CN' : 'en-US'
}

export function saveLocale(locale: string): void {
  localStorage.setItem(LOCALE_KEY, locale)
}

const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

export default i18n
