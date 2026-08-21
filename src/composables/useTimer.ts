import { ref, computed, onUnmounted, type Ref } from 'vue'
import type { TimerPhase, TimerSequence, TimerStatus, UserAudio } from '../types'
import { useAudio } from './useAudio'

export function useTimer(userAudiosRef: Ref<UserAudio[]>) {
  const { playSound, playEndSound, playReminderSound, stopSound } = useAudio()

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
  let wakeLock: WakeLockSentinel | null = null

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

  // --- Wake Lock ---

  async function requestWakeLock(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen')
      }
    } catch (err) {
      console.warn('[FlowTick] Wake Lock request failed:', err)
    }
  }

  function releaseWakeLock(): void {
    if (wakeLock) {
      wakeLock.release().catch((err) => {
        console.warn('[FlowTick] Wake Lock release failed:', err)
      })
      wakeLock = null
    }
  }

  // Re-acquire wake lock when page becomes visible again
  function handleVisibilityChange(): void {
    if (document.visibilityState === 'visible' && status.value === 'running') {
      requestWakeLock()
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

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
    requestWakeLock()
    beginTicking()
  }

  function pause(): void {
    if (status.value !== 'running') return
    status.value = 'paused'
    cleanup()
    releaseWakeLock()
  }

  function resume(): void {
    if (status.value !== 'paused') return
    status.value = 'running'
    requestWakeLock()
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
    releaseWakeLock()
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
    // Interval is already cleared by caller (start→cleanup, resume→pause→cleanup)
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
        playReminderSound(phase.reminderSound, userAudiosRef.value).catch(
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
        // Stop current sound and play end sound before looping
        stopSound()
        if (finishedPhase?.endSound && finishedPhase.endSound !== 'none') {
          playEndSound(finishedPhase.endSound, userAudiosRef.value).catch(
            (e) => console.warn('[FlowTick] playEndSound error:', e)
          )
        }
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
    releaseWakeLock()
  }

  // Clean up timer on component unmount
  onUnmounted(() => {
    cleanup()
    releaseWakeLock()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

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
