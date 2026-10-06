# Pocket Creature roadmap

Current version: **0.10.0**. The 0.10 public beta comes before the stable 1.0 readiness checks.

## Next — 1.0 readiness

- Verify native window perching, mixed-DPI monitors, game visibility, and existing-save migration on Windows; fix reported issues.
- Add optional launch at startup and validated save export/import.
- Make local-model connection and sensing status easier to understand.
- Complete live Ollama, tray, shortcut, sleep/resume, and notification checks.
- Review the prepared README, screenshots, license, contribution/security guides, CI, and release workflow; use beta feedback to finish the stable 1.0 release.

After 1.0, prioritize a small home and more toys, task/focus improvements, then documented character packs. Voice, music integrations, and multiple creatures can follow once the core companion is stable.

## 0.2 reactive companion — implemented

Cursor tracking/chasing, aggregate typing reactions, app-category outfits, idle naps and silent returns, independent toggles, and display-synced composited movement. Browser and simulated native tests cover the behavior; real Windows signal collection remains pending verification.

Updates preserve the companion loop and save data. Additional toys and the home ideas below remain future work.

The first milestone is a complete companion loop: interact → earn coins → personalize → focus together → come back to a familiar dragon.

## 0.1 — first playable beta

Implemented: animated dragon, petting, dragging/tossing, fetch, snacks, naps, moods, friendship, coins, three palettes, accessories, naming, focus sessions, reminders, notebook, local saves, reduced motion, and a Windows desktop shell.

Before calling desktop behavior stable: run the native Windows checklist in QA.md. Fix any transparency, click-through, tray, shortcut, DPI, or notification problems reported there.

## 0.3 file-aware conversations — implemented

Scoped file inspection, supported-editor title lookup, file greetings, structural questions, explicit project memory, a conversation panel, configurable activity commentary, and an optional localhost Ollama adapter. Browser and mock-native checks cover the workflow; editor detection and a real local model still need on-PC verification.

## Future — personality and toys

- More personality habits and additional toys beyond the implemented stretch, grooming, and settling behaviors.
- More activities: cardboard box, laser pointer, catching stars, idle treasure discoveries.
- Small event journal and completed-reminder history.
- A tiny home with a bed, toy basket, and unlockable decor.
- Export/import saves with schema validation; browser and desktop can then share progress intentionally.
- Better cooldown indicators and configurable sound effects.

## 0.4 automatic local AI — implemented

Thinking-aware Ollama requests with one bounded empty-answer retry, connection/model discovery, custom-name prompts, automatic activity/file comments, factual project memory, five readable themes, and optional transient screen snapshots for local vision models. Logic and mock-native tests pass; actual Windows capture and live model responses still need verification.

## 0.5 focused bubble companion — implemented

Click-to-talk input beside the creature replaces the Talk tab and conversation feed. File/memory tools move to Settings. First-person short prompts and enforced bubble bounds reduce rambling; automatic comments exclude manual conversation history and stale selected files. Foreground app/tab changes invalidate replies, settle briefly, and request fresh observations. Near-duplicate comments are suppressed. Current window titles are transient local context. New automatic comments are not saved in conversation history.

## 0.6 personality and game spectator mode — implemented

Four personality presets affect local-model prompts, built-in comments, and care reactions. Automatic/forced/off game mode, four corner choices, smaller pinned dragon, quiet spectator prompts, one-minute minimum automatic commentary, no roaming/cursor chasing/fetch, controller-friendly idle behavior, click-through creature with usable controls, and game-monitor following. Desktop recovery raises the overlay without focusing it, respects manual hide, restores normal bounds afterward, and adds Ctrl+Shift+G/tray recovery. Exclusive-fullscreen compatibility still requires testing and may need borderless display mode.

## Future — useful companion

- Task list and completion rewards, plus custom focus/break cycles.
- User-selected app/folder/website shortcuts. Keep native actions separate from the behavior engine.
- Optional PC status display (RAM, CPU, battery) with restrained reactions.
- Optional launch on startup, idle performance controls, and richer gameplay integrations.
- Reminder improvements: snooze, recurring reminders, and history.

## Future — desktop world

- More perching surfaces, after native top-edge perching is verified.
- Reliable multi-monitor wandering and negative-coordinate/DPI handling.
- Obstacle behavior around desktop windows, with easy disable controls.
- Multiple companions with simple interactions.

Real window tracking requires Windows-specific code. Keep it behind an adapter so the renderer remains testable in the standalone playground.

## Future — optional intelligence and community

- Broader optional AI context and conversation improvements. Core pet behaviors continue to work offline.
- Optional push-to-talk voice commands.
- Music reactions through an explicitly configured integration.
- Documented character packs: assets, animation states, palette, personality defaults. Start with data-only packs rather than executable community plugins.

## Architecture boundaries

1. Core model owns progress, rewards, deadlines, normalization, and portable simulation helpers.
2. Behavior layer chooses one primary activity at a time. Dragging overrides other actions; sleeping and focus override wandering/fetch; reduced motion overrides animation physics.
3. Presentation maps state to animations and controls.
4. Platform adapter owns only desktop features: window/tray, notifications, persistence, and future Windows integrations.
5. Future conversation adapters can propose creature dialogue and actions through a bounded interface; they should never gain arbitrary system execution.

## Experience requirements

No friendship loss or illness for being away. Always provide tray access, hiding, quiet mode, reduced motion, and manual control. Added features should make the companion more useful or more expressive without requiring the user to constantly manage it.

## 0.6.1 conversation continuity — implemented

Greeting removal before sentence trimming, silent startup/idle wake, protected manual conversations, two-minute space after automatic questions, and transient current-context starters passed to manual Ollama replies. Meaningful screen-change reactions are added in 0.7.

## 0.7 screen-change reactions — implemented

Local sampled-pixel checks skip unchanged views and tiny motion. Overlay masks, transient before/after vision prompts, current-app/monitor boundaries, quiet game instructions, and event-only title/file observations reduce repetition. Existing conversation pauses, short output, and cancellation remain active. Actual Windows capture and local-model semantic recognition require on-PC evidence.

## 0.8 physical reactions — implemented

Curious lean/head tilt, surprised face/startle, and small celebration, paired with the same automatic observation through bounded event/evidence metadata. File discovery and completed focus sessions have deterministic reactions. Independent setting, explicit previews, expiration/cooldowns, activity priorities, static game/reduced-motion poses, and preserved conversation pauses. Connected follow-ups and personal habits arrive in 0.9.

## 0.9 connected conversations and little habits — implemented

Recent manual conversation persists across foreground app switches with a 20-minute relevance window and ten-message prompt budget. Answered automatic starters become part of the explicit conversation; unattended observations stay transient. Explicit new-topic commands reset the thread. Forgetting discards pending replies, and failed sends restore prior history. Follow-up prompts favor an answer and one specific question only when useful, preserving all automatic conversation pauses and short output limits.

Silent stretching, grooming, and settling habits use personality preferences, cooldowns, and interaction priorities. Separate toggles and previews make them inspectable. Games and reduced motion use still poses; cosmetic habits require no model or extra screen access. Automated logic and browser checks cover the behavior; live model tone and Windows overlay behavior remain subject to on-PC verification.

## 0.10 window perching and personal memory — implemented

Restored-window top-edge perching uses bounded transient Windows geometry, a stable-window delay, smooth following, manual near-edge drops, and a 45-second pause after dragging away. Invalid/closed/minimized/maximized/fullscreen surfaces release the perch; game mode takes priority. PC reactions and a separate toggle control tracking. Browser previews and geometry/priority tests cover the behavior; real Windows/DPI checks remain pending.

A bounded editable profile stores a nickname, favorite games, interests, likes, and dislikes from clear first-person messages or direct edits. It is never inferred from screen/file content or AI replies. Local recall works without a model. Manual model replies can use enabled personal memory; automatic observations exclude it. Edit/forget/pause cancels stale pending replies and clears recent conversation. Schema-8 migration preserves earlier progress.

GitHub preparation includes project documentation/screenshots, MIT licensing and runtime notices, contribution/security guides, issue/PR templates, ignored generated/private files, Windows/Linux CI, package verification, checksummed release assets, and a 1.x draft-release workflow. The 0.10 beta is intended for public feedback before the stable 1.0 release.
