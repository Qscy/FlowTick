<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Upload, Trash2, Volume2 } from 'lucide-vue-next'
import type { UserAudio } from '../types'
import { MAX_FILE_SIZE, ALLOWED_AUDIO_EXTENSIONS } from '../composables/useStorage'

const { t } = useI18n()

defineProps<{
  audios: UserAudio[]
}>()

const emit = defineEmits<{
  add: [audio: UserAudio]
  delete: [id: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)

function handleFileSelect(event: Event): void {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const file = input.files[0]
  if (!file.type.startsWith('audio/')) return

  // Also validate file extension as defense-in-depth
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
    alert(t('audio.unsupportedFormat', { formats: ALLOWED_AUDIO_EXTENSIONS.join(', ') }))
    input.value = ''
    return
  }

  if (file.size > MAX_FILE_SIZE) {
    alert(t('audio.maxSize', { size: Math.round(MAX_FILE_SIZE / 1024 / 1024) }))
    input.value = ''
    return
  }

  const url = URL.createObjectURL(file)
  const audio: UserAudio = {
    id: crypto.randomUUID(),
    name: file.name.slice(0, 200), // Limit name length
    blob: file,
    url,
    createdAt: Date.now()
  }

  emit('add', audio)
  input.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-lg font-semibold text-flow-text">{{ t('audio.title') }}</h2>
    </div>

    <!-- Upload area -->
    <input
      ref="fileInput"
      type="file"
      accept="audio/mpeg,audio/wav,audio/ogg,audio/mp3,audio/x-wav"
      class="hidden"
      @change="handleFileSelect"
    />
    <button
      @click="fileInput?.click()"
      class="flex items-center justify-center gap-2 w-full px-4 py-4 border border-dashed border-flow-border rounded-xl text-flow-text-dim hover:text-flow-accent hover:border-flow-accent transition-colors"
    >
      <Upload class="w-5 h-5" />
      <span class="text-sm">{{ t('audio.upload') }}</span>
    </button>

    <!-- Audio list -->
    <div v-if="audios.length === 0" class="text-center py-8">
      <p class="text-sm text-flow-text-dim">{{ t('audio.empty') }}</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="audio in audios"
        :key="audio.id"
        class="flex items-center gap-3 p-3 bg-flow-panel rounded-xl border border-flow-border"
      >
        <Volume2 class="w-5 h-5 text-flow-accent shrink-0" />
        <span class="flex-1 text-sm text-flow-text truncate">{{ audio.name }}</span>
        <button
          @click="$emit('delete', audio.id)"
          class="p-1.5 hover:bg-flow-border rounded-lg transition-colors shrink-0"
          :title="t('audio.delete')"
        >
          <Trash2 class="w-4 h-4 text-flow-danger" />
        </button>
      </div>
    </div>
  </div>
</template>
