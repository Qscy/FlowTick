import { ref } from 'vue'
import * as Tone from 'tone'
import type { BuiltInSound, UserAudio } from '../types'

// Shared state - volume is reactive so UI can display it
const volume = ref(0.7)

// Lazy-initialized synthesizers (module-level singletons)
let synth: Tone.Synth | null = null
let polySynth: Tone.PolySynth | null = null
let metalSynth: Tone.MetalSynth | null = null
let membraneSynth: Tone.MembraneSynth | null = null
let activePlayer: Tone.Player | null = null

function ensureSynths(): void {
  if (synth) return

  synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.5 }
  }).toDestination()

  polySynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 }
  }).toDestination()

  metalSynth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5
  }).toDestination()

  membraneSynth = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 8,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
  }).toDestination()
}

function applyVolume(): void {
  Tone.Destination.volume.value = Tone.gainToDb(volume.value)
}

export function useAudio() {
  function setVolume(v: number): void {
    volume.value = Math.max(0, Math.min(1, v))
    applyVolume()
  }

  async function playSound(
    sound: BuiltInSound | string,
    userAudios: UserAudio[] = [],
    options?: { audioStart?: number; audioEnd?: number; phaseDuration?: number; loop?: boolean }
  ): Promise<void> {
    await Tone.start()
    ensureSynths()
    applyVolume()

    if (sound === 'none') return

    // Check if it's a user-uploaded audio
    const userAudio = userAudios.find((ua) => ua.id === sound)
    if (userAudio) {
      await playUserAudio(userAudio, options)
      return
    }

    playBuiltInSound(sound as BuiltInSound)
  }

  async function playUserAudio(
    userAudio: UserAudio,
    options?: { audioStart?: number; audioEnd?: number; phaseDuration?: number; loop?: boolean }
  ): Promise<void> {
    try {
      if (activePlayer) {
        activePlayer.dispose()
        activePlayer = null
      }

      // Use Tone.Buffer to load blob URL explicitly
      const buffer = await Tone.Buffer.fromUrl(userAudio.url)
      activePlayer = new Tone.Player(buffer).toDestination()
      applyVolume()

      const totalDuration = buffer.duration
      const startOffset = options?.audioStart ?? 0
      // Default end: phase duration from start, capped at audio length
      const defaultEnd = options?.phaseDuration
        ? Math.min(startOffset + options.phaseDuration, totalDuration)
        : totalDuration
      const endOffset = options?.audioEnd != null && options.audioEnd > startOffset
        ? Math.min(options.audioEnd, totalDuration)
        : defaultEnd
      const rangeDuration = endOffset - startOffset

      // Loop support: if sequence loop is on and audio range < phase duration
      if (options?.loop && options.phaseDuration && rangeDuration < options.phaseDuration) {
        activePlayer.loopStart = startOffset
        activePlayer.loopEnd = endOffset
        activePlayer.loop = true
        activePlayer.start(undefined, startOffset)
      } else if (rangeDuration < totalDuration) {
        // Play a specific range
        activePlayer.start(undefined, startOffset, rangeDuration)
      } else {
        // Play entire audio
        activePlayer.start()
      }
    } catch (e) {
      console.warn('[FlowTick] Failed to play user audio:', e)
      if (activePlayer) {
        activePlayer.dispose()
        activePlayer = null
      }
    }
  }

  function playBuiltInSound(sound: BuiltInSound): void {
    switch (sound) {
      case 'beep':
        synth?.triggerAttackRelease('C5', '8n')
        break
      case 'chime':
        polySynth?.triggerAttackRelease(['C5', 'E5', 'G5'], '4n')
        break
      case 'buzzer':
        synth?.triggerAttackRelease('A3', '4n')
        break
      case 'tick':
        metalSynth?.triggerAttackRelease('C4', '32n')
        break
      case 'bell':
        polySynth?.triggerAttackRelease(['C6', 'E6'], '2n')
        break
      case 'digital':
        membraneSynth?.triggerAttackRelease('C2', '16n')
        break
    }
  }

  async function playReminder(): Promise<void> {
    await Tone.start()
    ensureSynths()
    applyVolume()
    metalSynth?.triggerAttackRelease('C4', '16n')
  }

  function stopSound(): void {
    if (activePlayer) {
      activePlayer.stop()
      activePlayer.dispose()
      activePlayer = null
    }
    synth?.triggerRelease()
    if (polySynth) {
      polySynth.releaseAll()
    }
  }

  return {
    volume,
    setVolume,
    playSound,
    playReminder,
    stopSound
  }
}
