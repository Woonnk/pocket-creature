# Changelog

## 0.15.1 — public beta: voice, home, and desktop startup fix

- Publish the accumulated 0.11–0.15 improvements: Windows/Kokoro spoken replies, push-to-talk, local creature commands, organized settings, a movable home, decor, and task gestures. Earlier preview entries below describe development milestones first included in this public update.
- Fix the desktop protocol blocking voice-command/home/task modules. Desktop and demo now share a flat renderer asset inventory; desktop files, private saves, unknown paths, and other hosts remain blocked.
- Wait for trusted renderer readiness after save loading, control setup, and creature drawing before displaying the native overlay. DOM readiness alone no longer opens it. Tray controls and recovery cannot expose an unfinished window.
- Keep startup click-through, with a 15-second startup timeout. Page/preload failure, renderer crash, or an unresponsive window releases desktop clicks, hides the overlay, stops active voice/model work, and exits with a small error message.
- Add import-graph and real desktop-route tests, readiness/failure guard tests, and a browser regression that blocks a required module and verifies no readiness signal is sent. Preserve schema 11 and all progress/home preferences. The user reports the corrected launch and Kokoro setup work on their PC; comprehensive native acceptance remains open.

## 0.15.0 — little home and task reactions preview, unpublished

- Movable desktop home with a free wicker sleeping basket and ball basket; normalized position survives restarts and resizes. Drag or use arrow keys on its separate click-through-aware Home handle.
- Permanently unlock cloud/leaf beds, moss/sunset rugs, fern/flowers, mushroom/moon lamps, and a star plush with existing coins. Free removal/re-equipping never charges again. A collapsed Creature section shows one decor category at a time.
- Bed travel and curling for naps, a wake stretch, focus settling, and occasional autonomous basket visits/tosses. Solo play gives no rewards. Home routines can be disabled separately from the home. Explicit toy/stretch previews still work.
- Voice/text requests “go home” and “check your toys” use the existing whole-message command path. Games fold away the home while retaining the spectator corner; dragging, held voice input, conversation, typing, and reactions interrupt routines. Still poses respect reduced motion.
- Brief fresh-context task gestures for coding, browsing, music, games, and pauses after sustained typing. Built-in comments can reference the current changed window title without claiming to read its contents. Existing conversation cooldowns and short bubbles remain.
- Home artwork is excluded from screen-change capture and claims no desktop clicks; only its handle is interactive. No new telemetry, microphone mode, service, or model request is required.
- Save schema 11 preserves previous progress/preferences and adds owned decor/location/routine settings. This update stays local; GitHub remains on 0.10.

## 0.14.0 — creature voice commands preview, unpublished

- Explicit care/focus commands run locally before conversation: nap/wake, snack/pet/fetch, start/pause/resume/end focus, repeat, stop speech, and Quiet.
- Whole-message parsing accepts polite requests and spoken minute counts from 1 to 180. Questions, quotes, negations, and chained instructions remain conversation. Model replies never execute actions.
- Repeat naps and timer starts preserve the current state. Focus commands cancel fetch; fetch waits until focus/game mode ends. Commands also work from quick-talk text and reviewed transcripts.
- Listening lean, thinking tilt, and a short confirmation nod stay inside the artwork. Wandering/cursor chasing/typing reactions pause during voice input; games and reduced motion use still poses.
- Command examples stay in an expandable Voice help section. Creature commands stay out of conversation and personal memory; the existing microphone, cancellation, review, and Quiet policies remain.
- Save schema 10 and all previous progress/preferences remain compatible. Nothing published to GitHub.

## 0.13.0 — Companion redesign preview, unpublished

- Wider Companion frame with larger controls, readable cards, fixed section navigation, and an always-available Quiet toggle.
- Creature page focuses on care and play; wardrobe/colors and activity/reaction previews expand when needed.
- Settings is divided into General, Voice, Local AI, Activity, Games, Memory, Projects, and Privacy. Theme selection lives under General; AI connection status lives under Local AI.
- Search opens the matching settings page, expands advanced controls, and focuses the chosen setting. Empty/unsafe queries render safely; keyboard navigation and per-page scroll positions are supported.
- Voice delivery/game tuning and setup/help are collapsed by default. The voice dock avoids the wider panel and reserves space on smaller desktops.
- Cursor curiosity ignores companion controls, so fast movement through the wider panel does not interrupt previews. The header dragon follows the chosen palette.
- All prior control identities, preferences, and save schema 10 remain compatible. This update stays off GitHub.

## 0.12.0 — local voice conversation preview, unpublished

- Opt-in hold-to-talk button and Ctrl + Shift + F8/F9/F10 shortcuts; Windows offline recognition feeds the existing conversation engine, including local Ollama.
- Listening, recognizing, thinking, and speaking status; cancel/discard stale takes and replies; review uncertain transcripts or enable review for every message.
- Microphone capture closes before transcription, is bounded to 20 seconds, and stays in memory. Quiet, hide, lock/sleep, renderer crash, and shutdown close the helper. Speech playback is blocked during capture/transcription.
- Optional fixed-loopback Kokoro voices with setup guidance, bounded WAV synthesis, cancellation, and saved engine/voice choice. The service and model are not bundled.
- Repeat last reply replays the existing bubble with no extra AI request.
- Save schema 10 preserves progress and Windows voice choices. Push-to-talk defaults off. No GitHub publication.

## 0.11.0 — local voice preview, unpublished

- Optional local Windows spoken replies, installed-voice discovery, volume/pace, expressive delivery, automatic speech frequency, game mute, and playback indicator.
- Replace/cancel speech rather than queueing; stop button, tray action, Ctrl + Shift + M, and interruption on quick talk, drag, hide, quit, quiet mode, or changed automatic context.
- Save schema 9 preserves prior progress. No microphone, recordings, extra AI requests, or GitHub publication.
- Narrow sender-validated speech IPC, JSON stdin to the Windows helper, bounded text/delivery, helper timeout and parent lifetime checks.

## 0.10.0 — window perching and personal memory

- Restored foreground windows expose transient visible-frame geometry. Perching waits for a stable top edge, follows moves/resizes, and falls back to the desktop when the edge disappears.
- Dragging away pauses automatic perching for 45 seconds; dropping near an eligible edge chooses a relative seat. Game mode retains its corner priority. Reduced motion follows edges without animated travel.
- Editable nickname, favorite games, interests, likes, and dislikes; narrow literal first-person learning, honest direct recall, and manual-only model personalization.
- Profile edits/forgetting start a fresh conversation and discard pending replies; pausing memory retains the editable profile without learning or using it.
- GitHub-ready documentation, MIT license, screenshots, issue/PR templates, CI, verified Windows release assets, checksums, and a version-matched 1.x draft-release workflow.

## 0.9.0 — conversation continuity and silent habits

Recent manual conversations survive app switches with a 20-minute window. New-topic commands, failed-send rollback, and forgotten pending replies protect the thread. Silent stretching, grooming, and comfy poses vary with personality and respect interaction priorities.

## 0.8.0 — physical reactions

Curious, surprised, and celebration poses accompany grounded observations. Evidence gates, reaction cooldowns, preview controls, and still game/reduced-motion poses.

## 0.7.0 — meaningful screen changes

Transient before/current screen comparison skips unchanged scenes and ignores companion overlays; vision observations keep current context and existing conversation/game pauses.

## 0.6.x — personalities, games, and conversation timing

Four personalities, pinned game corners, click-through controls, monitor following, overlay recovery, quiet spectator behavior, silent startup/returns, and protected conversation bubbles.

## 0.5.0 — short bubble companion

Quick talk replaces the Talk tab; short first-person replies, fresh foreground context, stale-reply cancellation, and duplicate suppression.

## 0.4.0 — automatic local AI and themes

Ollama model discovery/reconnection, optional vision, five themes, factual project memory, and bounded thinking/output retry.

## 0.3.0 — scoped file observations

Connected-folder text sampling, supported editor-title lookup, structural file observations, and editable project descriptions.

## 0.1–0.2 — original companion

Original vector dragon, interaction loop, wardrobe/stats, notebook, focus/reminders, local saves, smooth movement, typing/cursor/app reactions, and idle naps.
