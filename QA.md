# Verification record — 0.15.1 desktop startup fix

Recorded 2026-10-07 UTC. Build host: Linux, Node.js 24.19.0. Windows x64 target: Electron 44.5.1. Browser tests: headless Chromium 153 with Playwright. Automated native checks use activity/capture/Ollama mocks; they do not substitute for running this version on Windows.

The user authorized publication of the accumulated update as the 0.15.1 beta. After the startup fix and documented Docker/Kokoro setup on 2026-10-07, they reported “all works.” This is a user-reported launch/voice setup smoke result, without a detailed device or test log; it does not close the native acceptance checklist. Automated Windows helper compilation and packaging run separately in GitHub Actions.

## Checks passed

- **94 Node tests** cover save normalization/migration, rewards/timers, physics, reaction priorities, scoped file reads, helper lifecycle, fixed-localhost AI requests, screen-change comparisons, conversation timing/continuity, personality/game behavior, silent habits, perching, personal memory, and PE header validation.
- **All fifteen browser suites** passed: core interactions, reactive motion, bubble conversations, automatic conversations/themes, game modes/personality, conversation timing, physical reactions, connected conversations/habits, perching/personal memory, voice controls, push-to-talk/local-voice conversation flows, the redesigned Companion panel, local creature commands/voice poses, home/decor/routines/task gestures, and renderer startup/readiness/failure.
- Existing tests preserve short replies, no Talk tab/chat feed, stale app/file cancellation, forgotten pending replies, conversation pauses, quiet/screen switches, and saved progress. Browser/standalone/mobile controls remain covered.
- Headless rendering measured Smooth at 60 rendered frames/second and Economy at 30 on a 60-callback/second display. This is not a performance measurement of the user's Windows PC.
- Standalone HTML generation completed. Earlier public previews remain in docs/screenshots; current voice/home/panel captures were reviewed locally and are not part of this publication.

## New perching and memory evidence

Geometry tests cover eligible restored edges, malformed/clipped/maximized/fullscreen rejection, negative coordinates, DIP projection, stable attachment, following a moving window, losing a surface, game/toggle priority, drag pauses, and near-edge drops. Activity-adapter tests verify geometry refresh while companion controls have focus, invalid-surface removal, and transient framing. The main-process mock verifies projected perches reach the renderer and disabling tracking removes them.

The new browser suite verifies attachment/following/fallback, manual detach and drop, reduced-motion stillness, game priority, and toggles. A real browser click test opens, moves, and closes the demo window; it caught and fixed a perched-creature hitbox intercepting controls below the edge.

Memory checks cover migration through schema 10, bounded fields, literal first-person learning, rejection of questions/third-person text/instructions, unknown/offline recall, manual-only model context, safe text rendering, editing and fresh history, reload with existing coins, paused learning, and forgotten pending replies. The main-process mock checks manual inclusion and disabled/automatic omission.

## Package and GitHub preparation

The Windows x64 portable 0.15.1 build is checked against the tested source using `npm run check:release`: DOS/PE headers, package version, all 35 desktop/renderer runtime files, all three unpacked PowerShell helpers, and Electron/Chromium notices. This verifies contents, not running the executable or hearing audio on Windows. Portable packaging removes and rejects leftover executable work files. The packaged executable’s non-resource PE sections were also compared with the recovered Electron runtime and matched; resource changes hold the updated archive integrity metadata.

GitHub workflow YAML, local documentation/image links, and generated/private-file exclusions are checked locally. Prepared CI covers Windows/Linux logic tests, Linux browser regressions, Windows helper compilation, and Windows portable build artifacts. Explicit beta publication commits or 0.x tags publish pre-releases with checksummed assets; 1.x tags prepare drafts. The 0.10 publication passed GitHub CI, including Windows helper compilation and packaging. The 0.15.1 publication triggers updated GitHub CI; check Actions for the actual run result.

## On-PC checks before 1.0

1. Quit the old version from its tray, leave Ollama running, and launch 0.15.1. Verify old name/theme/progress/folders and personal memory remain; push-to-talk stays opt-in and preserves its existing preference; existing voice output preferences remain. Relaunch after changing settings and memory.
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

No always-listening microphone, audio-beat integration, bundled model, app-launch actions, launch-at-startup, multiple creatures, or reminders while the app is closed. The model supplies bounded dialogue/reaction metadata and cannot operate the PC. Live Ollama semantics, native mixed-DPI geometry, and fullscreen behavior remain unverified on this Linux host.

## Voice checks

- Logic tests cover opt-in migration, bounded settings, quiet/hidden/game/volume gates, automatic speech budgets, expressive pace, replacement, stale completion, stop during asynchronous settings saves, failed playback, local-only browser voices, native JSON transport, helper shutdown, probe deduplication, and native IPC policy/shortcut handling.
- Browser voice suite uses a mocked desktop bridge to check installed voices, test/enable controls, saved voice and volume, payload delivery, pending/playing stop UI, stale events, quiet/game mute, game opt-in, mouth state, and Escape.
- Windows acceptance still pending: compile all three helpers (`powershell -NoProfile -File scripts/verify-windows-helper.ps1`), hear actual default/selected SAPI output, verify accents/non-ASCII, speed/volume and expression, cancellation during helper startup/playback, hotkey from a game, hidden/quit/crash cleanup, voice removal/no audio device, and Windows policy restrictions. Confirm no audio after mute or interruption and no orphan helper process.


## Voice conversation checks

- Logic tests cover opt-in migration, capture/transcribe/submit ordering, same-epoch status races, duplicate/stale transcript rejection, uncertain review, cancellation epochs, quiet/disabled gates, helper startup/shortcut framing, bounded output, and microphone watchdog termination.
- Local-voice tests verify fixed-loopback endpoints, redirect rejection, validated voices, plain-text synthesis, response size/WAV validation, cancellation, replacement, and Blob/audio cleanup. Main-process mocks verify trusted senders, microphone self-listening prevention, manual-model abortion on a new capture, quiet/hide/lock/crash input shutdown, and selected saved engine/voice.
- The new browser suite verifies hold/release, transcript → conversation → spoken reply, Repeat without extra model calls, safely rendered uncertain words, editing before sending, cancellation while thinking, stale capture rejection, saved shortcut, Quiet, Kokoro setup/synthetic WAV playback, disabling/re-enabling input, cursor movement during held capture, and cancellation during a settings save. A local generated push-to-talk capture was reviewed.
- Windows acceptance pending: compile helper C#, test default microphone capture and installed offline recognizer, short/non-ASCII and uncertain takes, 20-second limit, shortcut from a game, microphone permissions/no device, microphone closed before recognition, cancel during capture/recognition/model generation, key release after cancellation, sleep/lock/hide/crash/quit, and no orphan helper. The Linux host cannot verify those native operations.
- The user reports Kokoro setup works on their PC (2026-10-07). Detailed live Kokoro acceptance remains pending: install the documented CPU service, enumerate real voices, hear actual output, check pace/volume/latency, interrupt generation/playback, remove/stop the service, and reconnect. No real Ollama or Kokoro service was run on the Linux verification host.


## Companion redesign checks

The new panel suite verifies collapsed wardrobe/activity controls, one visible settings category, saved name/theme/palette/notebook, all four explicit themes, default-collapsed voice tuning, searchable labels, safe empty queries, successive Enter targets, focus/highlight, engine selection without implicitly enabling AI, category arrow keys, persistent navigation/footer during scroll, mobile widths, small-desktop microphone dock clearance, and standalone navigation. Existing browser suites now navigate the visible settings categories before checking the existing features. All original setting IDs were retained, with no duplicates. New panel captures were reviewed locally and are not included in the public repository.

On Windows, check 100%/150% DPI and smaller monitors: open/close the panel while playing, navigate each category, search for a voice/activity option, change themes, scroll advanced options, enable the voice dock, and verify footer controls receive clicks. Existing native voice, perching, and game compatibility acceptance remains pending.


## Creature voice command checks — 0.14

- Four new Node tests verify whole-message requests, politeness/literal names, spoken/numeric minute counts, invalid/negative/fractional/out-of-range durations, conversation-only questions/quotes/negations/combined requests, and pose priority/expiration.
- A new browser suite exercises care and focus with zero AI calls, unchanged sleep/active timer on duplicate requests, pause/resume/end, focus clearing fetch, reviewed commands before action, ordinary-question fallback, repeat without another request, cancellation while thinking, discarded stale commands, Quiet disabling recording/playback, paused wandering/cursor chasing, and still game/reduced-motion poses.
- The standalone HTML supports typed commands and preserves a commanded focus duration/deadline across reload. Commands do not enter chat history or personal memory. Existing held-button, mic lifecycle, persistence, and AI conversation suites also pass.
- On Windows, test “take a nap”, “give him a snack”, “start a twenty five minute focus session”, “pause focus”, “repeat that”, and “be quiet” with Ollama stopped. Verify installed dictation recognizes the phrases, hold/release closes the microphone, actual poses and audio look/sound right, uncertain text waits for Send, and the Quiet toggle restores input. These native checks remain pending.


## Home and task reactions checks

- Logic tests cover schema 11 home migration, owned/equipped validation, normalized/clamped placement and voice-dock avoidance, single-charge purchases/no overdraft, nap/focus/game/input priorities, wake/toy phases and one throw, autonomy/routine gates, manual previews, fresh-context gestures/cooldowns, and aggregate typing pauses. Title commentary tests cover settling, current-context replacement, bounds, cooldowns, and file/typing/focus priority.
- The home browser suite verifies decor affordability/all five slots/re-equipping, pointer and keyboard moves, cancelled drag and reload, bed travel/curl/wake stretch, star play without rewards, interruption, reduced-motion stillness, focus settling, game fold/restore, toggles, transparent-art click-through, current-app/typing gestures, no extra AI calls, narrow layout, and an autonomous idle basket visit without clicking a preview. Existing voice tests exercise input while the home is present; listening keeps the elevated creature anchored.
- Reviewed desktop, nap, and narrow-panel screenshots show the decorated corner and compact catalog. The standalone HTML bundles all three new modules.
- Windows acceptance pending: migrate an existing save, buy/re-equip each decor slot, drag/cancel/relaunch at 100%/150% DPI and on a second display, test underlying clicks around all artwork, voice dock avoidance, autonomous toy visits while roaming, nap/wake/focus interruptions, and game fold/restore without focus stealing. Verify short current-title comments and task gestures with actual browser/editor/music apps and typing counts. No audio-beat detection is claimed.


## Desktop startup regression — 0.15.1

The user's Windows screenshot of 0.15 shows the full playground, default controls, and a misplaced Home handle without the dragon. Inspection of the shipped source identified a desktop protocol allowlist missing `voice-commands.mjs`, `home.mjs`, `home-view.mjs`, and `task-reactions.mjs`. Static imports failed before the renderer applied desktop mode or installed click handling. The earlier demo/native-bridge tests did not request those files through the desktop protocol, so the passing 0.15 package-content check did not detect this failure.

The desktop and demo now share an inventory of existing flat renderer assets. Logic checks traverse the full import graph and call the actual registered desktop handler for the formerly blocked assets, with mocked Electron file transport. Unknown/private paths and other hosts return 404. Main-process tests verify DOM readiness does not show the window, unready/forged requests cannot enable interaction, valid renderer readiness shows it, and renderer failure hides it, restores click-through, and requests exit. Separate guard tests cover timeout, repeated/late readiness, and failure after ready.

The browser startup suite verifies every current module loads, saved name/progress remain, desktop mode/creature/home/control setup precede the single readiness report, and reload works. Aborting `home.mjs` reproduces import failure and sends no readiness signal. These checks use Chromium and a native bridge mock, not an actual Windows Electron process.

User-reported smoke result on 2026-10-07: after receiving 0.15.1 and setting up Kokoro, the user reported “all works.” Detailed acceptance remains open: existing-save migration, tray open/close, underlying desktop clicks, hide/recovery shortcuts, and induced startup/crash cleanup. The corrected package is unsigned; current audio/recognition/DPI/game checks remain pending as above.

## Publication CI corrections — 2026-10-09

The first 0.15.1 publication run passed 94 logic tests on Windows and Linux, but Windows helper compilation could not resolve `System.Speech.dll` by its bare filename. Voice helpers and the compilation check now load framework assemblies and use their full locations. The Linux browser voice-conversation test also exposed a fixed 700 ms playback assumption; it now waits for completed playback with a bounded timeout. Publication is retried with both fixes; check Actions for final results.
