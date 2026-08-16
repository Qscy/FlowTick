import { ref, computed, onUnmounted, type Ref } from 'vue'
import type { TimerPhase, TimerSequence, TimerStatus, UserAudio } from '../types'
import { useAudio } from './useAudio'

export function useTimer(userAudiosRef: Ref<UserAudio[]>) {
  const { playSound, playEndSound, playReminder, stopSound } = useAudio()

  // --- Reactive state ---
  const status = ref<TimerStatus>('idle')
  const currentSequence = ref<TimerSequence | null>(null)
  const currentPhaseIndex = ref(0)
  const remainingTime = ref(0)
  const totalTime = ref(0)
  const isReminderPlaying = ref(false)
  const loopCount = ref(0)

  // --- Internal non-reactive state ---
  let intervalId: ReturnType<typeof setInterval> | null = null
  let reminderCooldown = false

  // --- Computed ---
  const progress = computed(() => {
    if (totalTime.value === 0) return 0
    return ((totalTime.value - remainingTime.value) / totalTime.value) * 100
  })

  const currentPhase = computed(() => {
    const seq = currentSequence.value
    if (!seq || currentPhaseIndex.value >= seq.phases.length) return null
    return seq.phases[currentPhaseIndex.value]
  })

  // --- Timer control ---

  function start(sequence?: TimerSequence): void {
    if (status.value === 'running') return
    cleanup()

    const seq = sequence ?? currentSequence.value
    if (!seq) return

    currentSequence.value = seq
    currentPhaseIndex.value = 0
    loopCount.value = 1
    loadPhase(seq.phases[0])
    status.value = 'running'
    beginTicking()
  }

  function pause(): void {
    if (status.value !== 'running') return
    status.value = 'paused'
    cleanup()
  }

  function resume(): void {
    if (status.value !== 'paused') return
    status.value = 'running'
    beginTicking()
  }

  function reset(): void {
    cleanup()
    status.value = 'idle'
    // Keep currentSequence so user can press play again to restart
    currentPhaseIndex.value = 0
    remainingTime.value = 0
    totalTime.value = 0
    isReminderPlaying.value = false
  }

  /** Load a sequence without starting the timer (e.g. restore last session) */
  function loadSequence(sequence: TimerSequence): void {
    cleanup()
    status.value = 'idle'
    currentSequence.value = sequence
    currentPhaseIndex.value = 0
    loadPhase(sequence.phases[0])
  }

  function skipPhase(): void {
    if (!currentSequence.value) return
    advancePhase(currentPhaseIndex.value + 1)
  }

  // --- Internal helpers ---

  function loadPhase(phase: TimerPhase): void {
    remainingTime.value = phase.duration
    totalTime.value = phase.duration
    isReminderPlaying.value = false
    reminderCooldown = false

    // Play sound at phase start
    if (phase.sound !== 'none') {
      const seq = currentSequence.value
      playSound(phase.sound, userAudiosRef.value, {
        audioStart: phase.audioStart,
        audioEnd: phase.audioEnd,
        phaseDuration: phase.duration,
        loop: seq?.loop ?? false
      }).catch((e) => console.warn('[FlowTick] playSound error:', e))
    }
  }

  function beginTicking(): void {
    cleanup()
    intervalId = setInterval(tick, 1000)
  }

  function cleanup(): void {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
    stopSound()
  }

  function tick(): void {
    remainingTime.value -= 1

    // Handle reminder beeping — checked BEFORE advance so last-second beep isn't skipped
    const phase = currentPhase.value
    if (phase && phase.reminderSeconds > 0 && remainingTime.value > 0 && remainingTime.value <= phase.reminderSeconds) {
      if (!reminderCooldown && phase.reminderSound && phase.reminderSound !== 'none') {
        reminderCooldown = true
        isReminderPlaying.value = true
        playSound(phase.reminderSound, userAudiosRef.value, { phaseDuration: 1 }).catch(
          (e) => console.warn('[FlowTick] playReminder error:', e)
        )
        setTimeout(() => {
          reminderCooldown = false
          isReminderPlaying.value = false
        }, 600)
      }
    }

    // Phase ended — advance immediately without waiting for next tick
    if (remainingTime.value <= 0) {
      advancePhase(currentPhaseIndex.value + 1)
      return
    }
  }

  function advancePhase(nextIndex: number): void {
    const seq = currentSequence.value
    if (!seq) return

    const finishedPhase = seq.phases[nextIndex - 1]

    if (nextIndex >= seq.phases.length) {
      if (seq.loop) {
        loopCount.value += 1
        currentPhaseIndex.value = 0
        loadPhase(seq.phases[0])
        // Don't stop the timer, keep ticking
      } else {
        finish()
        // Play endSound after sequence completes
        if (finishedPhase?.endSound && finishedPhase.endSound !== 'none') {
          playEndSound(finishedPhase.endSound, userAudiosRef.value).catch(
            (e) => console.warn('[FlowTick] playEndSound error:', e)
          )
        }
      }
      return
    }

    // Stop current background music before playing end notification
    stopSound()
    if (finishedPhase?.endSound && finishedPhase.endSound !== 'none') {
      playEndSound(finishedPhase.endSound, userAudiosRef.value).catch(
        (e) => console.warn('[FlowTick] playEndSound error:', e)
      )
    }

    currentPhaseIndex.value = nextIndex
    loadPhase(seq.phases[nextIndex])
  }

  function finish(): void {
    cleanup()
    status.value = 'completed'
  }

  // Clean up timer on component unmount
  onUnmounted(cleanup)

  return {
    status,
    currentSequence,
    currentPhaseIndex,
    remainingTime,
    totalTime,
    progress,
    currentPhase,
    isReminderPlaying,
    loopCount,
    start,
    pause,
    resume,
    reset,
    skipPhase,
    loadSequence
  }
}

// Utility function - not tied to timer state
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
