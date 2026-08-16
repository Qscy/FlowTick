<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Volume2 } from 'lucide-vue-next'
import type { AppSettings, BuiltInSound } from '../types'

const { t } = useI18n()

const props = defineProps<{
  settings: AppSettings
}>()

const emit = defineEmits<{
  update: [settings: AppSettings]
}>()

const SOUND_OPTIONS: { value: BuiltInSound; labelKey: string }[] = [
  { value: 'beep', labelKey: 'sounds.beep' },
  { value: 'chime', labelKey: 'sounds.chime' },
  { value: 'buzzer', labelKey: 'sounds.buzzer' },
  { value: 'tick', labelKey: 'sounds.tick' },
  { value: 'bell', labelKey: 'sounds.bell' },
  { value: 'digital', labelKey: 'sounds.digital' },
  { value: 'none', labelKey: 'sounds.none' }
]

function updateVolume(event: Event): void {
  const val = Number((event.target as HTMLInputElement).value)
  emit('update', { ...props.settings, defaultVolume: val })
}

function updateSound(value: BuiltInSound): void {
  emit('update', { ...props.settings, defaultSound: value })
}
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-flow-text mb-2">{{ t('settings.title') }}</h2>

    <!-- Volume -->
    <div>
      <label class="block text-sm text-flow-text-dim mb-2">{{ t('settings.defaultVolume') }}</label>
      <div class="flex items-center gap-3">
        <Volume2 class="w-5 h-5 text-flow-text-dim shrink-0" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="settings.defaultVolume"
          @input="updateVolume"
          class="flex-1 h-2 bg-flow-border rounded-full appearance-none cursor-pointer accent-flow-accent"
        />
        <span class="text-sm text-flow-text w-12 text-right tabular-nums">
          {{ Math.round(settings.defaultVolume * 100) }}%
        </span>
      </div>
    </div>

    <!-- Default sound -->
    <div>
      <label class="block text-sm text-flow-text-dim mb-2">{{ t('settings.defaultSound') }}</label>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="s in SOUND_OPTIONS"
          :key="s.value"
          @click="updateSound(s.value)"
          class="px-3 py-2 text-sm rounded-xl border transition-colors"
          :class="
            settings.defaultSound === s.value
              ? 'bg-flow-accent text-flow-darker border-flow-accent font-medium'
              : 'bg-flow-darker text-flow-text border-flow-border hover:border-flow-accent'
          "
        >
          {{ t(s.labelKey) }}
        </button>
      </div>
    </div>
  </div>
</template>
