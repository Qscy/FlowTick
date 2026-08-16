// Built-in sound effects generated with Tone.js
export type BuiltInSound = 'beep' | 'chime' | 'buzzer' | 'tick' | 'bell' | 'digital' | 'none'

// User-uploaded audio file metadata
export interface UserAudio {
  id: string
  name: string
  blob: Blob
  url: string
  createdAt: number
}

// A single phase within a timer sequence
export interface TimerPhase {
  id: string
  duration: number        // seconds
  reminderSeconds: number // seconds before end to start beeping
  sound: BuiltInSound | string    // music during countdown
  endSound: BuiltInSound | string // sound after phase finishes
  reminderSound?: BuiltInSound | string // sound for reminder beeps
  label: string
  audioStart?: number     // start offset in seconds (for user audio)
  audioEnd?: number       // end time in seconds (for user audio)
}

// An ordered sequence of phases that can loop
export interface TimerSequence {
  id: string
  name: string
  phases: TimerPhase[]
  loop: boolean
  createdAt: number
  updatedAt: number
}

// Global application settings
export interface AppSettings {
  defaultVolume: number          // 0..1
  defaultSound: BuiltInSound
  theme: 'dark' | 'light'
}

// Timer runtime status
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed'
