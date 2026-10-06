# Verification record — 0.10.0

Recorded 2026-10-06 UTC. Build host: Linux, Node.js 24.19.0. Windows x64 target: Electron 44.5.1. Browser tests: headless Chromium 153 with Playwright. Automated native checks use activity/capture/Ollama mocks; they do not substitute for running this version on Windows.

## Checks passed

- **59 Node tests** cover save normalization/migration, rewards/timers, physics, reaction priorities, scoped file reads, helper lifecycle, fixed-localhost AI requests, screen-change comparisons, conversation timing/continuity, personality/game behavior, silent habits, perching, personal memory, and PE header validation.
- **All nine browser suites** passed: core interactions, reactive motion, bubble conversations, automatic conversations/themes, game modes/personality, conversation timing, physical reactions, connected conversations/habits, and perching/personal memory.
- Existing tests preserve short replies, no Talk tab/chat feed, stale app/file cancellation, forgotten pending replies, conversation pauses, quiet/screen switches, and saved progress. Browser/standalone/mobile controls remain covered.
- Headless rendering measured Smooth at 60 rendered frames/second and Economy at 30 on a 60-callback/second display. This is not a performance measurement of the user's Windows PC.
- Standalone HTML generation completed. Reviewed screenshots are in docs/screenshots.

## New perching and memory evidence

Geometry tests cover eligible restored edges, malformed/clipped/maximized/fullscreen rejection, negative coordinates, DIP projection, stable attachment, following a moving window, losing a surface, game/toggle priority, drag pauses, and near-edge drops. Activity-adapter tests verify geometry refresh while companion controls have focus, invalid-surface removal, and transient framing. The main-process mock verifies projected perches reach the renderer and disabling tracking removes them.

The new browser suite verifies attachment/following/fallback, manual detach and drop, reduced-motion stillness, game priority, and toggles. A real browser click test opens, moves, and closes the demo window; it caught and fixed a perched-creature hitbox intercepting controls below the edge.

Memory checks cover schema-8 migration, bounded fields, literal first-person learning, rejection of questions/third-person text/instructions, unknown/offline recall, manual-only model context, safe text rendering, editing and fresh history, reload with existing coins, paused learning, and forgotten pending replies. The main-process mock checks manual inclusion and disabled/automatic omission.

## Package and GitHub preparation

The Windows x64 portable 0.10.0 build completed successfully. DOS/PE headers and packaged version pass verification; all 22 desktop/renderer runtime files match the tested source byte for byte. The PowerShell helper is unpacked and Electron/Chromium notices are present. Five release assets, including SHA256SUMS.txt, were generated and their checksums verified. This verifies contents, not running the executable on Windows.

GitHub workflow YAML, local documentation/image links, and generated/private-file exclusions are checked locally. Prepared CI covers Windows/Linux logic tests, Linux browser regressions, Windows helper compilation, and Windows portable build artifacts. Explicit 1.x tags prepare a draft release with checksummed assets. These workflows have not run on GitHub; publication status and CI results must be checked on GitHub separately.

## On-PC checks before 1.0

1. Quit the old version from its tray, leave Ollama running, and launch 0.10. Verify old name/theme/progress/folders remain and new personal memory starts empty. Relaunch after changing settings and memory.
2. Open a restored browser/editor window at least 230 display-independent pixels below the overlay top. With PC reactions and perching enabled, stop moving/typing briefly; he should settle onto its edge. Move/resize it, focus companion controls, then minimize, close, maximize, restore, and switch windows. He should follow only a usable current surface and return safely when it disappears. Drag away (45-second break) and drop near an edge. Check underlying buttons remain usable.
3. Test perching at 100%/150% DPI, negative-coordinate monitors, and after moving windows between displays. Geometry is polled twice per second; very fast movement may lag. Compile/run the PowerShell/C# helper on Windows; policy failures should leave basic offline behavior available.
4. Tell him “Call me Noodle” and a favorite game. Ask for each fact without Ollama, then try a live local-model follow-up. Edit, pause, resume, forget, and restart. Forget/edit while a reply is generating; no old reply should appear. Screen/file observations must not create personal facts.
5. Answer an automatic question, switch apps, and continue the topic. Try explicit “new topic: …”, failed/offline sends, and forgetting while thinking. Check no repeated Hi, short manual/automatic bubbles, and 90-second manual/two-minute question pauses.
6. Try four personalities, three reactions, and three silent habits. Interrupt with typing, chat, fetch, naps, and focus. Check reduced motion and saved toggles. Actual model tone/evidence accuracy requires live observations; labels do not guarantee correct scene recognition.
7. Test automatic/forced/off game mode, controller play, small fixed corners, click-through, controls, and Ctrl+Shift+G/tray recovery without stealing game focus. Test both monitors and manual hide. Borderless/windowed may be required; exclusive-fullscreen visibility is not guaranteed.
8. Enable optional screen awareness with a vision model. Hold an unchanged page, open a dialog, scroll ordinary content, and switch tabs during generation. Check unchanged skips, fresh-context cancellation, honest silence, and conversation protection. Disable capture/AI/PC reactions and verify the relevant feature stops.
9. Connect a folder and open/save supported text/code files. Confirm sampled contents only for resolved connected files, filename-only observations outside roots/with ambiguity, and no stale-file commentary after app switches. Check disconnect/forget and model offline/reconnect recovery.
10. Check tray/show-hide, monitor selection, native reminders/notifications, shutdown of the activity helper, sleep/resume, accessibility, and longer game/idle performance. Record Windows version, display layout, steps, outcome, and evidence before marking native checks passed.

## Earlier PC evidence and remaining scope

Earlier user screenshots showed the Windows transparent overlay, typing/cursor reactions, Forest theme, and qwen3.5:4b connected with vision and actual replies. Later reports motivated conversation and game visibility changes. Those observations do not verify the newly built native perching or current game compatibility.

No microphone/voice, audio-beat integration, bundled model, app-launch actions, launch-at-startup, multiple creatures, or reminders while the app is closed. The model supplies bounded dialogue/reaction metadata and cannot operate the PC. Live Ollama semantics, native mixed-DPI geometry, and fullscreen behavior remain unverified on this Linux host.
