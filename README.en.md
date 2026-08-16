# FlowTick

A multi-phase timer tool built with Vue 3, featuring custom music, reminders, themes, and i18n.

[中文](./README.md)

## Features

- **Multi-phase Sequences** - Create timer sequences with multiple independently configurable phases
- **Countdown Music** - Play background music during each phase, supporting built-in sounds and user-uploaded audio
- **End Sound** - Play a short notification sound when a phase completes
- **Advance Reminder** - Trigger reminder beeps at a configurable time before phase end, with customizable reminder sound
- **User Audio Upload** - Upload MP3/WAV/OGG audio files with playback range selection and loop support
- **Loop Playback** - Loop the entire sequence with visual loop counter
- **Dark/Light Theme** - Two themes with one-click toggle
- **i18n** - Chinese/English bilingual support with automatic browser language detection
- **Animated Countdown** - Gradient progress ring, glow effects, and loop indicators

## Tech Stack

- [Vue 3](https://vuejs.org/) - Progressive JavaScript framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vite.dev/) - Lightning-fast build tool
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Tone.js](https://tonejs.github.io/) - Web Audio synthesis
- [vue-i18n](https://vue-i18n.intlify.dev/) - Internationalization
- [Lucide](https://lucide.dev/) - Icon library

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

## Project Structure

```
src/
├── assets/           # Static assets
├── components/       # Vue components
│   ├── AudioUploader.vue   # Audio upload management
│   ├── SettingsPanel.vue   # Settings panel
│   ├── TimerDisplay.vue    # Countdown display
│   ├── TimerEditor.vue     # Sequence editor
│   └── TimerList.vue       # Sequence list
├── composables/      # Composition functions
│   ├── useAudio.ts         # Audio playback control
│   ├── useStorage.ts       # Data persistence
│   └── useTimer.ts         # Core timer logic
├── i18n/             # Language packs
│   ├── index.ts
│   ├── zh-CN.ts
│   └── en-US.ts
├── types/            # TypeScript type definitions
├── App.vue           # Root component
├── main.ts           # Entry point
└── style.css         # Global styles
```

## License

MIT
