import type { TimerSequence, TimerPhase, UserAudio, AppSettings, BuiltInSound } from '../types'

const SEQUENCES_KEY = 'flowtick_sequences'
const SETTINGS_KEY = 'flowtick_settings'
const LAST_SEQ_KEY = 'flowtick_last_sequence_id'
const DB_NAME = 'flowtick_audios'
const STORE_NAME = 'audios'
const DB_VERSION = 1
const MAX_SEQUENCES = 100

const DEFAULT_SETTINGS: AppSettings = {
  defaultVolume: 0.7,
  defaultSound: 'beep',
  theme: 'dark'
}

const VALID_SOUNDS: BuiltInSound[] = ['beep', 'chime', 'buzzer', 'tick', 'bell', 'digital', 'none']

// --- Sanitize parsed JSON to prevent prototype pollution ---

function sanitizeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeKeys)
  }
  if (obj !== null && typeof obj === 'object') {
    const clean: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
      clean[key] = sanitizeKeys(value)
    }
    return clean
  }
  return obj
}

// --- Validation helpers ---

function isValidPhase(p: unknown): p is TimerPhase {
  if (!p || typeof p !== 'object') return false
  const phase = p as Record<string, unknown>
  return (
    typeof phase.id === 'string' &&
    typeof phase.duration === 'number' && phase.duration > 0 && phase.duration <= 86400 &&
    typeof phase.reminderSeconds === 'number' && phase.reminderSeconds >= 0 &&
    typeof phase.sound === 'string' &&
    (phase.endSound === undefined || typeof phase.endSound === 'string') &&
    (phase.reminderSound === undefined || typeof phase.reminderSound === 'string') &&
    typeof phase.label === 'string' && phase.label.length <= 100 &&
    (phase.audioStart === undefined || (typeof phase.audioStart === 'number' && phase.audioStart >= 0)) &&
    (phase.audioEnd === undefined || (typeof phase.audioEnd === 'number' && phase.audioEnd >= 0))
  )
}

function isValidSequence(s: unknown): s is TimerSequence {
  if (!s || typeof s !== 'object') return false
  const seq = s as Record<string, unknown>
  return (
    typeof seq.id === 'string' &&
    typeof seq.name === 'string' && seq.name.length <= 200 &&
    Array.isArray(seq.phases) && seq.phases.length <= 50 && seq.phases.every(isValidPhase) &&
    typeof seq.loop === 'boolean' &&
    typeof seq.createdAt === 'number' &&
    typeof seq.updatedAt === 'number'
  )
}

function isValidSettings(s: unknown): s is AppSettings {
  if (!s || typeof s !== 'object') return false
  const settings = s as Record<string, unknown>
  return (
    typeof settings.defaultVolume === 'number' && settings.defaultVolume >= 0 && settings.defaultVolume <= 1 &&
    typeof settings.defaultSound === 'string' && VALID_SOUNDS.includes(settings.defaultSound as BuiltInSound) &&
    (settings.theme === 'dark' || settings.theme === 'light')
  )
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function useStorage() {
  // --- Timer Sequences (localStorage) ---

  function saveSequences(sequences: TimerSequence[]): void {
    try {
      localStorage.setItem(SEQUENCES_KEY, JSON.stringify(sequences.slice(0, MAX_SEQUENCES)))
    } catch (e) {
      console.warn('[FlowTick] Failed to save sequences to localStorage:', e)
    }
  }

  function loadSequences(): TimerSequence[] {
    try {
      const data = localStorage.getItem(SEQUENCES_KEY)
      if (!data) return []
      const parsed = sanitizeKeys(JSON.parse(data))
      if (!Array.isArray(parsed)) return []
      return parsed.filter(isValidSequence).map((s) => {
        const seq = s as TimerSequence
        seq.phases.forEach((p) => {
          if (!p.endSound) p.endSound = 'beep'
          if (p.reminderSound === undefined) p.reminderSound = 'none'
        })
        return seq
      }).slice(0, MAX_SEQUENCES)
    } catch {
      return []
    }
  }

  // --- App Settings (localStorage) ---

  function saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch (e) {
      console.warn('[FlowTick] Failed to save settings to localStorage:', e)
    }
  }

  function loadSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY)
      if (!data) return { ...DEFAULT_SETTINGS }
      const parsed = sanitizeKeys(JSON.parse(data))
      return isValidSettings(parsed) ? parsed as AppSettings : { ...DEFAULT_SETTINGS }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  }

  // --- Last used sequence ID (localStorage) ---

  function saveLastSequenceId(id: string): void {
    try {
      localStorage.setItem(LAST_SEQ_KEY, id)
    } catch {
      // ignore
    }
  }

  function loadLastSequenceId(): string | null {
    try {
      return localStorage.getItem(LAST_SEQ_KEY)
    } catch {
      return null
    }
  }

  // --- User Audios (IndexedDB) ---

  async function saveUserAudios(audios: UserAudio[]): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    for (const audio of audios) {
      if (audio.blob.size > MAX_FILE_SIZE) continue
      store.put({
        id: audio.id,
        name: audio.name.slice(0, 200),
        blob: audio.blob,
        createdAt: audio.createdAt
      })
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async function loadUserAudios(): Promise<UserAudio[]> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result as Array<{
          id: string
          name: string
          blob: Blob
          createdAt: number
        }>
        resolve(
          results.map((r) => ({
            id: r.id,
            name: r.name,
            blob: r.blob,
            url: URL.createObjectURL(r.blob),
            createdAt: r.createdAt
          }))
        )
      }
      request.onerror = () => reject(request.error)
    })
  }

  async function deleteUserAudio(id: string, revocableUrl?: string): Promise<void> {
    if (revocableUrl) URL.revokeObjectURL(revocableUrl)
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(id)
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  return {
    saveSequences,
    loadSequences,
    saveSettings,
    loadSettings,
    saveUserAudios,
    loadUserAudios,
    deleteUserAudio,
    saveLastSequenceId,
    loadLastSequenceId
  }
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
export { MAX_SEQUENCES }
export const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.webm']
