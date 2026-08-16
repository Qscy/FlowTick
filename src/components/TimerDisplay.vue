<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-vue-next'
import type { TimerSequence, TimerStatus } from '../types'
import { formatTime } from '../composables/useTimer'

const { t } = useI18n()

const props = defineProps<{
  sequence: TimerSequence | null
  status: TimerStatus
  remainingTime: number
  totalTime: number
  currentPhaseIndex: number
  progress: number
  loopCount: number
}>()

const emit = defineEmits<{
  start: []
  pause: []
  resume: []
  reset: []
  skip: []
}>()

const CIRCLE_RADIUS = 110
const CENTER = 140
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS

const strokeDashoffset = computed(() => {
  return CIRCUMFERENCE - (props.progress / 100) * CIRCUMFERENCE
})

// Digit animation - trigger scale on second change
const digitScale = ref(false)
watch(() => props.remainingTime, () => {
  digitScale.value = true
  setTimeout(() => { digitScale.value = false }, 150)
})

const currentPhaseLabel = computed(() => {
  if (props.status === 'idle' && props.remainingTime === 0) return t('display.ready')
  return props.sequence?.phases[props.currentPhaseIndex]?.label ?? t('display.ready')
})

const phaseInfo = computed(() => {
  if (props.status === 'idle') return ''
  const total = props.sequence?.phases.length ?? 0
  return t('display.phaseInfo', { current: props.currentPhaseIndex + 1, total })
})

const loopInfo = computed(() => {
  if (props.status === 'idle' || props.loopCount <= 1) return ''
  return t('display.loopInfo', { current: props.loopCount })
})

// Phase separator dots on the ring
const phaseDots = computed(() => {
  const seq = props.sequence
  if (!seq || seq.phases.length <= 1) return []
  const totalDuration = seq.phases.reduce((sum, p) => sum + p.duration, 0)
  if (totalDuration === 0) return []

  const dots: { angle: number }[] = []
  let accumulated = 0
  for (let i = 0; i < seq.phases.length - 1; i++) {
    accumulated += seq.phases[i].duration
    const fraction = accumulated / totalDuration
    const angle = fraction * 360 - 90 // Start from top
    dots.push({ angle })
  }
  return dots
})

// Loop indicator dots (max 8 shown)
const MAX_LOOP_DOTS = 8
const loopDots = computed(() => {
  if (props.status === 'idle' || props.loopCount === 0) return []
  const seq = props.sequence
  if (!seq?.loop && props.loopCount <= 1) return []

  const total = Math.min(props.loopCount, MAX_LOOP_DOTS)
  const dots: { index: number; state: 'completed' | 'current' | 'future' }[] = []
  for (let i = 0; i < total; i++) {
    dots.push({
      index: i,
      state: i < props.loopCount - 1 ? 'completed' : 'current'
    })
  }
  return dots
})

function handleToggle(): void {
  if (props.status === 'running') emit('pause')
  else if (props.status === 'paused') emit('resume')
  else emit('start')
}

function polarToCartesian(angle: number, radius: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad)
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center p-2 pb-0 md:p-8 select-none">
    <!-- Circular progress ring -->
    <div class="relative mb-2 md:mb-8 timer-ring-container">
      <svg viewBox="0 0 280 280" class="-rotate-90 w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] md:w-[280px] md:h-[280px]">
        <defs>
          <!-- Gradient for progress ring -->
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="var(--color-flow-accent)" />
            <stop offset="100%" stop-color="var(--color-flow-accent-light)" />
          </linearGradient>
          <!-- Glow filter -->
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- Background ring -->
        <circle
          :cx="CENTER" :cy="CENTER" :r="CIRCLE_RADIUS"
          fill="none" stroke="var(--color-flow-border)" stroke-width="10"
          opacity="0.4"
        />

        <!-- Progress ring with glow -->
        <circle
          :cx="CENTER" :cy="CENTER" :r="CIRCLE_RADIUS"
          fill="none" stroke="url(#progressGradient)" stroke-width="10" stroke-linecap="round"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="strokeDashoffset"
          class="transition-all duration-1000 ease-linear progress-ring"
          filter="url(#glow)"
        />

        <!-- Phase separator dots -->
        <circle
          v-for="(dot, i) in phaseDots"
          :key="'phase-dot-' + i"
          :cx="polarToCartesian(dot.angle + 90, CIRCLE_RADIUS).x"
          :cy="polarToCartesian(dot.angle + 90, CIRCLE_RADIUS).y"
          r="3"
          fill="var(--color-flow-panel)"
          stroke="var(--color-flow-border)"
          stroke-width="1"
        />
      </svg>

      <!-- Loop indicator dots around outer edge -->
      <div v-if="loopDots.length > 0" class="absolute inset-0 pointer-events-none">
        <svg viewBox="0 0 280 280" class="absolute inset-0 w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] md:w-[280px] md:h-[280px]">
          <circle
            v-for="dot in loopDots"
            :key="'loop-dot-' + dot.index"
            :cx="140 + 130 * Math.cos((dot.index / loopDots.length) * 2 * Math.PI - Math.PI / 2)"
            :cy="140 + 130 * Math.sin((dot.index / loopDots.length) * 2 * Math.PI - Math.PI / 2)"
            :r="dot.state === 'current' ? 5 : 3.5"
            :fill="dot.state === 'current' ? 'var(--color-flow-accent)' : dot.state === 'completed' ? 'var(--color-flow-accent)' : 'var(--color-flow-border)'"
            :opacity="dot.state === 'completed' ? 0.6 : 1"
            :class="{ 'loop-dot-pulse': dot.state === 'current' }"
          />
        </svg>
      </div>

      <!-- Center content -->
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <div
          class="text-3xl sm:text-4xl md:text-6xl font-bold text-flow-text tabular-nums tracking-wider transition-transform duration-150"
          :class="{ 'scale-105': digitScale }"
        >
          {{ formatTime(remainingTime) }}
        </div>
        <div class="text-[10px] sm:text-xs md:text-sm text-flow-text-dim mt-0.5 md:mt-2 truncate max-w-28 sm:max-w-32 md:max-w-48">
          {{ currentPhaseLabel }}
        </div>
        <div class="text-[9px] sm:text-[10px] md:text-xs text-flow-text-dim mt-0.5 md:mt-1">
          {{ phaseInfo }}
        </div>
        <div v-if="loopInfo" class="text-[9px] sm:text-[10px] md:text-xs text-flow-accent mt-0.5 md:mt-1 font-medium">
          {{ loopInfo }}
        </div>
      </div>
    </div>

    <!-- Control buttons -->
    <div class="flex items-center gap-2.5 sm:gap-3 md:gap-4">
      <button
        v-if="status !== 'idle'"
        @click="$emit('reset')"
        class="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-flow-panel hover:bg-flow-border transition-colors"
        :title="t('display.reset')"
      >
        <RotateCcw class="w-4 h-4 sm:w-5 sm:h-5 text-flow-text" />
      </button>

      <button
        @click="handleToggle"
        :title="status === 'running' ? t('display.pause') : status === 'paused' ? t('display.resume') : t('display.start')"
        class="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-flow-accent hover:bg-flow-accent-light transition-colors shadow-lg shadow-flow-accent/20"
      >
        <Play v-if="status !== 'running'" class="w-7 h-7 sm:w-8 sm:h-8 text-flow-darker ml-1" />
        <Pause v-else class="w-7 h-7 sm:w-8 sm:h-8 text-flow-darker" />
      </button>

      <button
        v-if="status !== 'idle'"
        @click="$emit('skip')"
        class="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-flow-panel hover:bg-flow-border transition-colors"
        :title="t('display.skip')"
      >
        <SkipForward class="w-4 h-4 sm:w-5 sm:h-5 text-flow-text" />
      </button>
    </div>

    <!-- Completed indicator -->
    <div v-if="status === 'completed'" class="mt-4 text-flow-accent text-sm font-medium">
      {{ t('display.completed') }}
    </div>
  </div>
</template>

<style scoped>
.progress-ring {
  animation: breathe 2s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.75; }
}

.loop-dot-pulse {
  animation: dotPulse 1.5s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% { opacity: 1; r: 5; }
  50% { opacity: 0.6; r: 4; }
}
</style>
