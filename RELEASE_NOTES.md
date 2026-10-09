# Pocket Creature 0.15.1 — voice, a little home, and safer startup

The desktop dragon gains voice conversations, an organized Companion panel, and his own movable home. This public beta includes the accumulated 0.11–0.15 improvements and the desktop startup fix.

- **Spoken replies:** use installed Windows voices or a separate local Kokoro service. Choose a voice, volume, pace, and chatter level. Stop or repeat the last reply without another AI request; games mute speech by default.
- **Push-to-talk:** hold the voice button or configured shortcut, then release to send. Offline Windows recognition supports local creature commands and optional Ollama conversations. Review uncertain words, cancel a take, or use Quiet to pause input/output. Microphone input is opt-in.
- **Creature commands:** say or type “take a nap,” “give him a snack,” “start a 25-minute focus session,” “repeat that,” “go home,” or “check your toys.” Care/focus commands work without Ollama; listening/thinking poses and a confirmation nod show progress.
- **Calmer controls:** care/play stay on the Creature page. Settings has separate General, Voice, Local AI, Activity, Games, Memory, Projects, and Privacy pages, with search and readable themes.
- **A little home:** a free bed and toy basket, permanent coin unlocks for decor, and saved placement. Drag the Home handle or use arrow keys. He curls up for naps, stretches after waking, settles for focus, and occasionally plays with toys. Home routines can be paused, and games tuck the home away.
- **Task gestures:** brief current-app poses, stretches after typing pauses, and bounded changed-window-title comments use existing signals without extra AI calls or audio sensing.
- **Startup repair:** required voice/home modules now load through the desktop protocol. The overlay waits for completed initialization. Startup failure, renderer crash, or an unresponsive window hides it and releases input rather than trapping desktop clicks.
- Existing name, coins, themes, voice settings, notes, memory, and progress migrate to save schema 11.

**Windows:** download `Pocket-Creature-0.15.1-Windows.exe`. Quit an older copy through its tray or Task Manager before launching. Keep your save; deletion is unnecessary. The executable is unsigned.

**Browser:** download and open `Pocket-Creature-Playground.html`. Native PC sensing, microphone recognition, and local services require the desktop app.

**Kokoro:** install/open Docker Desktop first, then run the setup command in the [voice guide](https://github.com/Woonnk/pocket-creature/blob/main/docs/guide.md). Kokoro and Ollama are separate optional services; they are not bundled or installed automatically.

94 Node tests, fifteen browser suites, and local package-integrity checks passed in the recorded verification. The user reports the corrected launch and Kokoro setup work on their PC. This smoke report does not verify every feature: broader Windows microphone/audio, DPI, perching, game visibility, and live-model checks remain open in QA.md. GitHub Actions separately tests/builds this release and supplies checksummed downloads.

This is a pre-release beta before stable 1.0.
