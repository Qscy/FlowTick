<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Trash2, Plus, Save, X } from 'lucide-vue-next'
import { useAudio } from '../composables/useAudio'
import type { TimerSequence, TimerPhase, BuiltInSound, UserAudio } from '../types'
import { formatTime } from '../composables/useTimer'

const { t } = useI18n()
const { playSound } = useAudio()

const props = defineProps<{
  sequence: TimerSequence | null
  userAudios: UserAudio[]
}>()

const emit = defineEmits<{
  save: [sequence: TimerSequence]
  cancel: []
}>()

const MAX_PHASES = 50

const BUILT_IN_SOUNDS: { value: BuiltInSound; labelKey: string }[] = [
  { value: 'beep', labelKey: 'sounds.beep' },
  { value: 'chime', labelKey: 'sounds.chime' },
  { value: 'buzzer', labelKey: 'sounds.buzzer' },
  { value: 'tick', labelKey: 'sounds.tick' },
  { value: 'bell', labelKey: 'sounds.bell' },
  { value: 'digital', labelKey: 'sounds.digital' },
  { value: 'none', labelKey: 'sounds.none' }
]

const BUILT_IN_VALUES = new Set<string>(BUILT_IN_SOUNDS.map((s) => s.value))

const userSoundOptions = computed(() =>
  props.userAudios.map((a) => ({ value: a.id, label: `🎵 ${a.name}` }))
)

function isUserAudio(sound: string): boolean {
  return !BUILT_IN_VALUES.has(sound)
}

function previewSound(sound: string | undefined): void {
  if (!sound || sound === 'none') return
  playSound(sound, props.userAudios, { phaseDuration: 1 }).catch(() => {})
}

function onSoundChange(phase: TimerPhase): void {
  // Always clear audio range when sound changes
  phase.audioStart = undefined
  phase.audioEnd = undefined
}

function defaultAudioEnd(phase: TimerPhase): number {
  const start = phase.audioStart ?? 0
  return start + phase.duration
}

const isNew = computed(() => !props.sequence)

const editing = ref<TimerSequence>(createEmptySequence())

watch(
  () => props.sequence,
  (seq) => {
    if (seq) {
      editing.value = {
        ...seq,
        phases: seq.phases.map((p) => ({ ...p }))
      }
    } else {
      editing.value = createEmptySequence()
    }
  },
  { immediate: true }
)

const totalDuration = computed(() =>
  editing.value.phases.reduce((sum, p) => sum + p.duration, 0)
)

function createEmptySequence(): TimerSequence {
  return {
    id: crypto.randomUUID(),
    name: '',
    phases: [],
    loop: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

function addPhase(): void {
  if (editing.value.phases.length >= MAX_PHASES) return
  const idx = editing.value.phases.length + 1
  const phase: TimerPhase = {
    id: crypto.randomUUID(),
    duration: 15,
    reminderSeconds: 5,
    sound: 'none',
    endSound: 'beep',
    reminderSound: 'none',
    label: `${t('editor.phase')} ${idx}`
  }
  editing.value.phases.push(phase)
}

function removePhase(index: number): void {
  editing.value.phases.splice(index, 1)
}

function handleSave(): void {
  if (editing.value.phases.length === 0) return

  // Clamp numeric values before saving
  for (const phase of editing.value.phases) {
    phase.duration = Math.max(1, Math.min(86400, Math.round(phase.duration) || 1))
    phase.reminderSeconds = Math.max(0, Math.min(phase.duration, Math.round(phase.reminderSeconds) || 0))
    phase.label = phase.label.slice(0, 100)
    // Clamp audio range
    if (phase.audioStart != null) phase.audioStart = Math.max(0, Math.round(phase.audioStart))
    if (phase.audioEnd != null) {
      phase.audioEnd = Math.max((phase.audioStart ?? 0) + 1, Math.round(phase.audioEnd))
    }
  }
  editing.value.name = editing.value.name.slice(0, 200)
  editing.value.updatedAt = Date.now()
  emit('save', { ...editing.value })
}
</script>

<template>
  <div class="bg-flow-panel rounded-2xl p-4 md:p-6 border border-flow-border w-full max-w-2xl max-h-[90vh] md:max-h-none overflow-y-auto md:overflow-visible">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-semibold text-flow-text">
        {{ isNew ? t('editor.create') : t('editor.edit') }}
      </h2>
      <button
        @click="$emit('cancel')"
        class="p-2 hover:bg-flow-border rounded-lg transition-colors"
      >
        <X class="w-5 h-5 text-flow-text-dim" />
      </button>
    </div>

    <!-- Name -->
    <div class="mb-5">
      <label class="block text-sm text-flow-text-dim mb-2">{{ t('editor.name') }}</label>
      <input
        v-model="editing.name"
        type="text"
        class="w-full px-4 py-2 bg-flow-darker border border-flow-border rounded-xl text-flow-text placeholder:text-flow-text-dim focus:outline-none focus:border-flow-accent transition-colors"
        :placeholder="t('editor.namePlaceholder')"
      />
    </div>

    <!-- Loop toggle -->
    <div class="mb-5 flex items-center gap-3">
      <input
        v-model="editing.loop"
        type="checkbox"
        id="loop-toggle"
        class="w-5 h-5 accent-flow-accent cursor-pointer"
      />
      <label for="loop-toggle" class="text-flow-text cursor-pointer">{{ t('editor.loop') }}</label>
    </div>

    <!-- Phases -->
    <div class="mb-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-flow-text-dim">{{ t('editor.phaseArrangement') }}</h3>
        <span class="text-xs text-flow-text-dim">
          {{ t('editor.totalDuration') }}: {{ formatTime(totalDuration) }}
        </span>
      </div>

      <div class="space-y-3 max-h-48 md:max-h-72 overflow-y-auto pr-1">
        <div
          v-for="(phase, index) in editing.phases"
          :key="phase.id"
          class="flex flex-wrap items-center gap-2 p-3 bg-flow-darker rounded-xl border border-flow-border"
        >
          <!-- Phase label -->
          <div class="w-full md:w-32 shrink-0">
            <input
              v-model="phase.label"
              type="text"
              class="w-full px-3 py-1.5 bg-flow-panel border border-flow-border rounded-lg text-sm text-flow-text placeholder:text-flow-text-dim focus:outline-none focus:border-flow-accent"
              :placeholder="`${t('editor.phase')} ${index + 1}`"
            />
          </div>

          <!-- Duration -->
          <div class="flex items-center gap-1">
            <span class="text-xs text-flow-text-dim whitespace-nowrap">{{ t('editor.duration') }}</span>
            <input
              v-model.number="phase.duration"
              type="number"
              min="1"
              max="86400"
              class="w-16 px-2 py-1.5 bg-flow-panel border border-flow-border rounded-lg text-sm text-flow-text text-center focus:outline-none focus:border-flow-accent"
            />
            <span class="text-xs text-flow-text-dim">{{ t('editor.seconds') }}</span>
          </div>

          <!-- Reminder -->
          <div class="flex items-center gap-1">
            <span class="text-xs text-flow-text-dim whitespace-nowrap">{{ t('editor.reminderBefore') }}</span>
            <input
              v-model.number="phase.reminderSeconds"
              type="number"
              min="0"
              :max="phase.duration"
              class="w-16 px-2 py-1.5 bg-flow-panel border border-flow-border rounded-lg text-sm text-flow-text text-center focus:outline-none focus:border-flow-accent"
            />
            <span class="text-xs text-flow-text-dim">{{ t('editor.reminderAfter') }}</span>
          </div>

          <!-- Music selector (countdown background) -->
          <div class="flex items-center gap-1">
            <span class="text-xs text-flow-text-dim whitespace-nowrap">{{ t('editor.music') }}</span>
            <select
              v-model="phase.sound"
              @change="onSoundChange(phase); previewSound(phase.sound)"
              class="px-2 py-1.5 bg-flow-panel border border-flow-border rounded-lg text-sm text-flow-text focus:outline-none focus:border-flow-accent"
            >
              <optgroup :label="t('editor.builtInSounds')">
                <option v-for="s in BUILT_IN_SOUNDS" :key="s.value" :value="s.value">
                  {{ t(s.labelKey) }}
                </option>
              </optgroup>
              <optgroup v-if="userSoundOptions.length > 0" :label="t('editor.userAudios')">
                <option v-for="s in userSoundOptions" :key="s.value" :value="s.value">
                  {{ s.label }}
                </option>
              </optgroup>
            </select>
          </div>

          <!-- End sound selector -->
          <div class="flex items-center gap-1">
            <span class="text-xs text-flow-text-dim whitespace-nowrap">{{ t('editor.endSound') }}</span>
            <select
              v-model="phase.endSound"
              @change="previewSound(phase.endSound)"
              class="px-2 py-1.5 bg-flow-panel border border-flow-border rounded-lg text-sm text-flow-text focus:outline-none focus:border-flow-accent"
            >
              <option v-for="s in BUILT_IN_SOUNDS" :key="s.value" :value="s.value">
                {{ t(s.labelKey) }}
              </option>
            </select>
          </div>

          <!-- Reminder sound selector -->
          <div class="flex items-center gap-1">
            <span class="text-xs text-flow-text-dim whitespace-nowrap">{{ t('editor.reminderSound') }}</span>
            <select
              v-model="phase.reminderSound"
              @change="previewSound(phase.reminderSound)"
              class="px-2 py-1.5 bg-flow-panel border border-flow-border rounded-lg text-sm text-flow-text focus:outline-none focus:border-flow-accent"
            >
              <optgroup :label="t('editor.builtInSounds')">
                <option v-for="s in BUILT_IN_SOUNDS" :key="s.value" :value="s.value">
                  {{ t(s.labelKey) }}
                </option>
              </optgroup>
              <optgroup v-if="userSoundOptions.length > 0" :label="t('editor.userAudios')">
                <option v-for="s in userSoundOptions" :key="s.value" :value="s.value">
                  {{ s.label }}
                </option>
              </optgroup>
            </select>
          </div>

          <!-- Audio range (only for user audio) -->
          <div v-if="isUserAudio(phase.sound)" class="flex items-center gap-1 w-full mt-1">
            <span class="text-xs text-flow-text-dim whitespace-nowrap">{{ t('editor.playFrom') }}</span>
            <input
              v-model.number="phase.audioStart"
              type="number"
              min="0"
              placeholder="0"
              class="w-14 px-2 py-1 bg-flow-panel border border-flow-border rounded-lg text-sm text-flow-text text-center focus:outline-none focus:border-flow-accent"
            />
            <span class="text-xs text-flow-text-dim">{{ t('editor.playTo') }}</span>
            <input
              v-model.number="phase.audioEnd"
              type="number"
              min="1"
              :placeholder="String(defaultAudioEnd(phase))"
              class="w-14 px-2 py-1 bg-flow-panel border border-flow-border rounded-lg text-sm text-flow-text text-center focus:outline-none focus:border-flow-accent"
            />
            <span class="text-xs text-flow-text-dim">{{ t('editor.playUnit') }}</span>
          </div>

          <!-- Delete button -->
          <button
            @click="removePhase(index)"
            class="p-1.5 hover:bg-flow-border rounded-lg transition-colors shrink-0"
            :title="t('editor.deletePhase')"
          >
            <Trash2 class="w-4 h-4 text-flow-danger" />
          </button>
        </div>
      </div>

      <!-- Add phase button -->
      <button
        @click="addPhase"
        :disabled="editing.phases.length >= MAX_PHASES"
        class="mt-3 flex items-center gap-2 px-4 py-2 w-full border border-dashed border-flow-border rounded-xl text-flow-text-dim hover:text-flow-accent hover:border-flow-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus class="w-4 h-4" />
        <span class="text-sm">{{ t('editor.addPhase') }}</span>
      </button>
    </div>

    <!-- Actions -->
    <div class="flex gap-3">
      <button
        @click="handleSave"
        :disabled="editing.phases.length === 0"
        class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-flow-accent hover:bg-flow-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-flow-darker font-medium rounded-xl transition-colors"
      >
        <Save class="w-4 h-4" />
        {{ t('editor.save') }}
      </button>
      <button
        @click="$emit('cancel')"
        class="px-6 py-3 border border-flow-border text-flow-text rounded-xl hover:bg-flow-panel transition-colors"
      >
        {{ t('editor.cancel') }}
      </button>
    </div>
  </div>
</template>
