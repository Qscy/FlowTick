<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Volume2, Sun, Moon, Languages, Github } from 'lucide-vue-next'
import { useTimer } from './composables/useTimer'
import { useStorage, MAX_SEQUENCES } from './composables/useStorage'
import { useAudio } from './composables/useAudio'
import { saveLocale } from './i18n'
import TimerDisplay from './components/TimerDisplay.vue'
import TimerEditor from './components/TimerEditor.vue'
import TimerList from './components/TimerList.vue'
import AudioUploader from './components/AudioUploader.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import type { TimerSequence, UserAudio, AppSettings } from './types'

const { t, locale } = useI18n()

// --- Storage ---
const {
  saveSequences, loadSequences,
  saveSettings, loadSettings,
  saveUserAudios, loadUserAudios,
  saveLastSequenceId, loadLastSequenceId
} = useStorage()

// --- Audio ---
const { volume, setVolume } = useAudio()

// --- Timer (pass userAudios as reactive ref) ---
const userAudios = ref<UserAudio[]>([])
const timer = useTimer(userAudios)

// --- App state ---
const sequences = ref<TimerSequence[]>([])
const settings = ref<AppSettings>({
  defaultVolume: 0.7,
  defaultSound: 'beep',
  theme: 'dark'
})

const showEditor = ref(false)
const editingSequence = ref<TimerSequence | null>(null)
const activeTab = ref<'timers' | 'audio' | 'settings'>('timers')

// --- Theme ---
function applyTheme(theme: 'dark' | 'light'): void {
  document.documentElement.dataset.theme = theme
}

function toggleTheme(): void {
  const newTheme = settings.value.theme === 'dark' ? 'light' : 'dark'
  settings.value = { ...settings.value, theme: newTheme }
  applyTheme(newTheme)
  saveSettings(settings.value)
}

// --- Locale ---
function toggleLocale(): void {
  const newLocale = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
  locale.value = newLocale
  saveLocale(newLocale)
}

// --- Initialization ---
onMounted(async () => {
  sequences.value = loadSequences()
  settings.value = loadSettings()
  setVolume(settings.value.defaultVolume)
  applyTheme(settings.value.theme)

  // Restore last used sequence
  const lastId = loadLastSequenceId()
  if (lastId) {
    const lastSeq = sequences.value.find((s) => s.id === lastId)
    if (lastSeq && lastSeq.phases.length > 0) {
      timer.loadSequence(lastSeq)
    }
  }

  const audios = await loadUserAudios()
  userAudios.value = audios
})

// --- Sequence CRUD ---
function handleSave(sequence: TimerSequence): void {
  const idx = sequences.value.findIndex((s) => s.id === sequence.id)
  if (idx >= 0) {
    sequences.value[idx] = sequence
  } else {
    sequences.value.push(sequence)
  }
  saveSequences(sequences.value)
  closeEditor()
}

function handleDelete(id: string): void {
  sequences.value = sequences.value.filter((s) => s.id !== id)
  saveSequences(sequences.value)
}

// --- Timer control ---
function handleStart(sequence: TimerSequence): void {
  timer.start(sequence)
  saveLastSequenceId(sequence.id)
}

function handleTimerStart(): void {
  timer.start()
  if (timer.currentSequence.value) {
    saveLastSequenceId(timer.currentSequence.value.id)
  }
}

// --- Editor ---
function handleEdit(sequence: TimerSequence): void {
  editingSequence.value = sequence
  showEditor.value = true
}

function handleCreate(): void {
  if (sequences.value.length >= MAX_SEQUENCES) {
    alert(t('timerList.maxReached', { max: MAX_SEQUENCES }))
    return
  }
  editingSequence.value = null
  showEditor.value = true
}

function closeEditor(): void {
  showEditor.value = false
  editingSequence.value = null
}

// --- Settings ---
function handleSettingsUpdate(newSettings: AppSettings): void {
  settings.value = newSettings
  setVolume(newSettings.defaultVolume)
  saveSettings(newSettings)
}

// --- Audio management ---
function handleAudioAdd(audio: UserAudio): void {
  userAudios.value.push(audio)
  saveUserAudios(userAudios.value)
}

function handleAudioDelete(id: string): void {
  const audio = userAudios.value.find((a) => a.id === id)
  if (audio?.url) URL.revokeObjectURL(audio.url)
  userAudios.value = userAudios.value.filter((a) => a.id !== id)
  saveUserAudios(userAudios.value)
}

// Clean up Object URLs on unmount
onUnmounted(() => {
  for (const audio of userAudios.value) {
    if (audio.url) URL.revokeObjectURL(audio.url)
  }
})
</script>

<template>
  <div class="h-full flex flex-col bg-flow-dark">
    <!-- Header -->
    <header class="flex items-center justify-between px-6 py-4 bg-flow-panel border-b border-flow-border shrink-0">
      <div class="flex items-center gap-3">
        <img src="/logo-icon.svg" alt="" class="w-6 h-6 text-flow-accent" />
        <h1 class="text-xl font-bold text-flow-text tracking-tight">FlowTick</h1>
      </div>
      <div class="flex items-center gap-2">
        <!-- Volume -->
        <div class="flex items-center gap-2 px-3 py-1.5 bg-flow-darker rounded-lg">
          <Volume2 class="w-4 h-4 text-flow-text-dim" />
          <span class="text-xs text-flow-text-dim tabular-nums">{{ Math.round(volume * 100) }}%</span>
        </div>
        <!-- Language toggle -->
        <button
          @click="toggleLocale"
          :title="t('locale.switch')"
          class="p-2 hover:bg-flow-border rounded-lg transition-colors"
        >
          <Languages class="w-4 h-4 text-flow-text-dim" />
        </button>
        <!-- Theme toggle -->
        <button
          @click="toggleTheme"
          :title="settings.theme === 'dark' ? t('theme.light') : t('theme.dark')"
          class="p-2 hover:bg-flow-border rounded-lg transition-colors"
        >
          <Sun v-if="settings.theme === 'dark'" class="w-4 h-4 text-flow-text-dim" />
          <Moon v-else class="w-4 h-4 text-flow-text-dim" />
        </button>
        <!-- GitHub -->
        <a
          href="https://github.com/Qscy/FlowTick"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub"
          class="p-2 hover:bg-flow-border rounded-lg transition-colors"
        >
          <Github class="w-4 h-4 text-flow-text-dim" />
        </a>
      </div>
    </header>

    <!-- Main layout -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar -->
      <div class="w-80 flex flex-col border-r border-flow-border bg-flow-darker shrink-0">
        <!-- Tab navigation -->
        <nav class="flex items-center p-2 gap-1">
          <button
            v-for="tab in (['timers', 'audio', 'settings'] as const)"
            :key="tab"
            @click="activeTab = tab"
            class="flex-1 px-3 py-2 text-sm rounded-lg transition-colors"
            :class="activeTab === tab ? 'bg-flow-panel text-flow-text' : 'text-flow-text-dim hover:text-flow-text'"
          >
            {{ t(`tabs.${tab}`) }}
          </button>
        </nav>

        <!-- Tab content -->
        <div class="flex-1 overflow-y-auto p-4">
          <TimerList
            v-if="activeTab === 'timers'"
            :sequences="sequences"
            @start="handleStart"
            @edit="handleEdit"
            @delete="handleDelete"
            @create="handleCreate"
          />
          <AudioUploader
            v-else-if="activeTab === 'audio'"
            :audios="userAudios"
            @add="handleAudioAdd"
            @delete="handleAudioDelete"
          />
          <SettingsPanel
            v-else
            :settings="settings"
            @update="handleSettingsUpdate"
          />
        </div>
      </div>

      <!-- Main content area -->
      <main class="flex-1 flex items-center justify-center">
        <TimerDisplay
          :sequence="timer.currentSequence.value"
          :status="timer.status.value"
          :remaining-time="timer.remainingTime.value"
          :total-time="timer.totalTime.value"
          :current-phase-index="timer.currentPhaseIndex.value"
          :progress="timer.progress.value"
          :loop-count="timer.loopCount.value"
          @start="handleTimerStart"
          @pause="timer.pause"
          @resume="timer.resume"
          @reset="timer.reset"
          @skip="timer.skipPhase"
        />
      </main>
    </div>

    <!-- Editor modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showEditor"
          class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          @click.self="closeEditor"
        >
          <TimerEditor
            :sequence="editingSequence"
            :user-audios="userAudios"
            @save="handleSave"
            @cancel="closeEditor"
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
