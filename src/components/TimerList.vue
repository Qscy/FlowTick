<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Play, Edit, Trash2, Plus, Repeat } from 'lucide-vue-next'
import type { TimerSequence } from '../types'
import { formatTime } from '../composables/useTimer'

const { t } = useI18n()

defineProps<{
  sequences: TimerSequence[]
}>()

defineEmits<{
  start: [sequence: TimerSequence]
  edit: [sequence: TimerSequence]
  delete: [id: string]
  create: []
}>()

function totalDuration(seq: TimerSequence): number {
  return seq.phases.reduce((sum, p) => sum + p.duration, 0)
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-flow-text">{{ t('timerList.title') }}</h2>
      <button
        @click="$emit('create')"
        class="flex items-center gap-2 px-4 py-2 bg-flow-accent hover:bg-flow-accent-light text-flow-darker text-sm font-medium rounded-xl transition-colors"
      >
        <Plus class="w-4 h-4" />
        {{ t('timerList.create') }}
      </button>
    </div>

    <!-- Empty state -->
    <div v-if="sequences.length === 0" class="text-center py-16">
      <div class="text-flow-text-dim text-sm mb-3">{{ t('timerList.empty') }}</div>
      <button
        @click="$emit('create')"
        class="text-flow-accent hover:text-flow-accent-light text-sm transition-colors"
      >
        {{ t('timerList.emptyHint') }}
      </button>
    </div>

    <!-- Sequence cards -->
    <div v-else class="space-y-2">
      <div
        v-for="seq in sequences"
        :key="seq.id"
        class="group flex items-center gap-4 p-4 bg-flow-panel hover:bg-flow-border/50 rounded-xl border border-flow-border transition-colors"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="font-medium text-flow-text truncate">{{ seq.name }}</h3>
            <span
              v-if="seq.loop"
              class="flex items-center gap-1 text-xs text-flow-accent bg-flow-accent/10 px-1.5 py-0.5 rounded"
            >
              <Repeat class="w-3 h-3" />
              {{ t('timerList.loop') }}
            </span>
          </div>
          <div class="text-xs text-flow-text-dim">
            {{ t('timerList.phases', { count: seq.phases.length }) }} · {{ t('timerList.totalDuration') }} {{ formatTime(totalDuration(seq)) }}
          </div>
        </div>

        <!-- Action buttons (always visible on mobile, hover on desktop) -->
        <div class="flex items-center gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            @click="$emit('start', seq)"
            class="p-2 bg-flow-accent hover:bg-flow-accent-light rounded-lg transition-colors"
            :title="t('timerList.start')"
          >
            <Play class="w-4 h-4 text-flow-darker" />
          </button>
          <button
            @click="$emit('edit', seq)"
            class="p-2 hover:bg-flow-border rounded-lg transition-colors"
            :title="t('timerList.edit')"
          >
            <Edit class="w-4 h-4 text-flow-text" />
          </button>
          <button
            @click="$emit('delete', seq.id)"
            class="p-2 hover:bg-flow-border rounded-lg transition-colors"
            :title="t('timerList.delete')"
          >
            <Trash2 class="w-4 h-4 text-flow-danger" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
