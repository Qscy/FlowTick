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
let endPlayer: Tone.Player | null = null
let reminderPlayer: Tone.Player | null = null

// Dedicated synths for end sounds (never interrupted by stopSound)
let endSynth: Tone.Synth | null = null
let endPolySynth: Tone.PolySynth | null = null
let endMetalSynth: Tone.MetalSynth | null = null
let endMembraneSynth: Tone.MembraneSynth | null = null

// Map legacy jsfxr preset names → Tone.js built-in names
const SOUND_ALIAS: Record<string, BuiltInSound> = {
  tone: 'beep',
  pickupCoin: 'chime',
  laserShoot: 'tick',
  explosion: 'buzzer',
  powerUp: 'bell',
  hitHurt: 'buzzer',
  jump: 'digital',
  blipSelect: 'tick',
  synth: 'digital',
  click: 'tick'
}

function resolveSoundName(sound: string): BuiltInSound {
  if (['beep', 'chime', 'buzzer', 'tick', 'bell', 'digital', 'none'].includes(sound)) {
    return sound as BuiltInSound
  }
  return SOUND_ALIAS[sound] ?? 'beep'
}

function ensureSynths(): void {
  if (!synth) {
    synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.5 }
    }).toDestination()
  }

  if (!polySynth) {
    polySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 }
    }).toDestination()
  }

  if (!metalSynth) {
    metalSynth = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5
    }).toDestination()
  }

  if (!membraneSynth) {
    membraneSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 8,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
    }).toDestination()
  }

  // End sound synths — independent from background music synths
  if (!endSynth) {
    endSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.5 }
    }).toDestination()
  }

  if (!endPolySynth) {
    endPolySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 }
    }).toDestination()
  }

  if (!endMetalSynth) {
    endMetalSynth = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5
    }).toDestination()
  }

  if (!endMembraneSynth) {
    endMembraneSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 8,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
    }).toDestination()
  }
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

    playBuiltInSound(resolveSoundName(sound))
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

  async function playReminderSound(
    sound: BuiltInSound | string,
    userAudios: UserAudio[] = []
  ): Promise<void> {
    await Tone.start()
    ensureSynths()
    applyVolume()

    if (sound === 'none') return

    // Use dedicated reminderPlayer to avoid interrupting background music (activePlayer)
    if (reminderPlayer) {
      reminderPlayer.stop()
      reminderPlayer.dispose()
      reminderPlayer = null
    }

    const userAudio = userAudios.find((ua) => ua.id === sound)
    if (userAudio) {
      try {
        const buffer = await Tone.Buffer.fromUrl(userAudio.url)
        reminderPlayer = new Tone.Player(buffer).toDestination()
        applyVolume()
        const duration = Math.min(1, buffer.duration)
        reminderPlayer.start(undefined, 0, duration)
      } catch (e) {
        console.warn('[FlowTick] Failed to play reminder audio:', e)
        if (reminderPlayer) {
          reminderPlayer.dispose()
          reminderPlayer = null
        }
      }
      return
    }

    playBuiltInSound(resolveSoundName(sound))
  }

  async function playEndSound(
    sound: BuiltInSound | string,
    userAudios: UserAudio[] = []
  ): Promise<void> {
    await Tone.start()
    ensureSynths()
    applyVolume()

    if (sound === 'none') return

    // Dispose previous end sound player if still active
    if (endPlayer) {
      endPlayer.stop()
      endPlayer.dispose()
      endPlayer = null
    }

    const userAudio = userAudios.find((ua) => ua.id === sound)
    if (userAudio) {
      try {
        const buffer = await Tone.Buffer.fromUrl(userAudio.url)
        endPlayer = new Tone.Player(buffer).toDestination()
        applyVolume()
        endPlayer.start()
      } catch (e) {
        console.warn('[FlowTick] Failed to play end sound audio:', e)
        if (endPlayer) {
          endPlayer.dispose()
          endPlayer = null
        }
      }
      return
    }

    playBuiltInEndSound(resolveSoundName(sound))
  }

  function playBuiltInEndSound(sound: BuiltInSound): void {
    switch (sound) {
      case 'beep':
        endSynth?.triggerAttackRelease('C5', '8n')
        break
      case 'chime':
        endPolySynth?.triggerAttackRelease(['C5', 'E5', 'G5'], '4n')
        break
      case 'buzzer':
        endSynth?.triggerAttackRelease('A3', '4n')
        break
      case 'tick':
        endMetalSynth?.triggerAttackRelease('C4', '32n')
        break
      case 'bell':
        endPolySynth?.triggerAttackRelease(['C6', 'E6'], '2n')
        break
      case 'digital':
        endMembraneSynth?.triggerAttackRelease('C2', '16n')
        break
    }
  }

  function stopSound(): void {
    if (activePlayer) {
      activePlayer.stop()
      activePlayer.dispose()
      activePlayer = null
    }
    if (reminderPlayer) {
      reminderPlayer.stop()
      reminderPlayer.dispose()
      reminderPlayer = null
    }
    synth?.triggerRelease()
    if (polySynth) {
      polySynth.releaseAll()
    }
    metalSynth?.triggerRelease()
    membraneSynth?.triggerRelease()
  }

  return {
    volume,
    setVolume,
    playSound,
    playEndSound,
    playReminderSound,
    stopSound
  }
}
