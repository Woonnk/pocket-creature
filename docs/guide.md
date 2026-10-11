# Pocket Creature

A little company. A little chaos. A tiny animated dragon for your Windows desktop.

**Version 0.23.0 — public beta.** No account, API key, or paid AI service is required.

## Try it

**Windows:** Run `Pocket-Creature-0.23.0-Windows.exe`, the portable download from the [0.23 beta release](https://github.com/Woonnk/pocket-creature/releases/tag/v0.23.0). It launches over your desktop. Open its controls from the **Companion** button or tray icon. The app is unsigned. The user reports the corrected launch and Kokoro setup work on their PC; broader native checks remain open. Earlier user screenshots confirm the overlay, readable themes, and live Ollama replies. See [QA.md](../QA.md) for remaining native checks. Quit the old version from its tray before launching this update; existing progress stays in the same desktop save location.

**No installation:** Open `dist/Pocket-Creature-Playground.html` in a current desktop browser. This is a self-contained playground with the same creature, games, timers, and notebook. Browser progress belongs to that browser and file location; it is separate from desktop progress.

**From source on Windows:** Install Node.js 24 from https://nodejs.org, extract the whole project, then double-click `Start-Windows.cmd`. Its first run installs the Electron runtime over the internet. Subsequent launches use the installed runtime. Or use:

```powershell
npm ci
npm start
```

## Automatic local AI

Leave Ollama running and launch the companion. In local AI mode, the app checks the connection on startup and every 15 seconds, detects installed local models, and prefers `qwen3.5:4b` when no model is selected. Existing explicitly selected built-in mode is preserved. The installed-model list also supplies suggestions beside the model field. No account or API key is required and no model is downloaded by the companion.

The short-output bug is fixed: requests prefer thinking off where the model supports it, provide 1,024 generated tokens, and retry an empty final answer once with 2,048. The two attempts share a 90-second timeout. Thinking controls are selected from model metadata when available. The dragon's actual chosen name is used in its AI personality.

With Automatic AI conversations enabled, Lil Wonks or your renamed dragon starts comments without you sending a message. File changes and PC activity supply context; the model can choose silence. Chatty/Balanced/Minimal set minimum AI intervals of 18/45/120 seconds; file events and foreground-window changes can prompt a comment after eight seconds, after the new activity settles for two seconds. Game mode has at least a 60-second automatic-comment interval, including urgent context/file events; Minimal keeps its longer 120-second interval. Built-in game comments are also spaced at least a minute apart. Quiet mode, idle naps, dragging, fetch, and manual chat suppress automatic replies. Switching apps or browser tabs cancels outdated automatic replies, including switches between two tabs in the same browser. The current foreground title supplies fresh context, even without screenshots. A title alone is not proof of page/game content. When the foreground context and selected-file sample are unchanged, title-only observations skip the model request; a changed title/file supplies a fresh event. With screen awareness, pixel comparison can trigger a fresh observation in the same app. Automatic prompts exclude conversation history and inactive files; recent comments are used only to avoid repetition. Automatic comments are limited to one sentence and 24 words, and near-duplicate comments are suppressed. These guardrails reduce rambling but do not guarantee model accuracy. Main-process checks also stop quiet/disabled/hidden/idle automatic requests. Basic local reactions continue when Ollama is offline; manual AI requests display a connection error beside the quick message input, preserving the message for retry.

Supported editor titles now trigger filename curiosity even without a connected folder. **Settings → Projects → Connect folder** permits automatic inspection of files opened in VS Code, Cursor, Notepad, or Notepad++. Saved changes refresh the sample. Unsaved editor buffers are not read. Unresolved or duplicate filenames produce filename-only observations and are explicitly marked unread. **Show a file** remains an optional manual shortcut, including in the browser playground.

Turn on **Settings → Screen awareness** once to include occasional snapshots of the companion's selected monitor with a connected vision model. Snapshots include whatever is visible on that display, including other applications. The switch defaults off. Screen checks run only during eligible automatic observation attempts; no separate capture loop runs while you chat, sleep, hide the dragon, or use quiet mode. Images are sent only to the fixed local Ollama endpoint and never written to disk or saved state. Automatic snapshots are bounded to 960 × 540; manual snapshots to 1,280 × 720. One previous automatic snapshot is held in RAM to compare the next view, then replaced; switching foreground context, turning off screen awareness, hiding, going idle, or quitting clears it. Image access needs PC awareness on and a model advertising vision support. Screenshots can support observations about browsers, apps, or games; this is not continuous video or reliable game telemetry. Screenshots and file content are reference data, and the model has no ability to execute code or click.

Automatic project memory saves observed project filenames and recognizes statements such as “I'm building a horror game” in your conversation. It uses observations and your statements rather than model-invented facts. The expandable Project memory section lets you inspect or edit the description. Forget project removes the saved facts and prevents immediate automatic recreation for that project until you explicitly save a description again. Forget recent conversation in Settings separately removes the last 20 explicit conversation messages. New automatic observations are shown only in bubbles; a starter enters saved history only when you explicitly answer it. Raw file samples and screenshots are not saved, but conversation messages can quote observations or content.

**Settings → General → Companion theme** switches Dark (default), Light, Midnight Blue, Forest Green, or Follow Windows. The palette covers the panel, text, inputs, buttons, speech bubbles, launcher, and timer. Follow Windows responds to system color preference changes. Theme choice persists locally.

Files must be supported text/code formats and no larger than 256 KB. At most the first 32 KB are inspected; AI receives up to 16,000 characters of that sample, reduced to 6,000 when two comparison images are attached. Eight connected folders and 30 project memories are supported. Folder lookup scans at most 5,000 entries, 500 directories, and five nested levels, skipping dependency/output folders, hidden directories, and symlinks. Broad folders can exceed these limits; connect a specific project folder. A newly created or renamed file may take up to 30 seconds to appear in the index.

The browser playground includes themes, built-in file observations, and project memory. Desktop AI connections and screen capture use the native bridge and are not available in the browser artifact.

## Reactions to meaningful screen changes

Enable **Settings → Screen awareness** with a local vision model running. Automatic conversations and PC awareness must also be enabled. Existing screen preferences are preserved; the browser playground cannot inspect your desktop.

Each eligible attempt compares a small 160 × 90 pixel sample with the previous processed view. An unchanged screen, slight pixel noise, or tiny cursor change skips the model request. The dragon, bubble, and controls are masked from comparison, including their previous locations. A wider change or a localized dialog-sized change sends BEFORE and CURRENT snapshots to Ollama. New foreground contexts use only the current image; images from different apps/monitors are never paired.

The model is asked to react briefly to a new page/dialog, visible error, loading/menu/results screen, or changed task. It should choose silence for scrolling, minor edits, video frames, and ordinary gameplay motion. Pixel change is a trigger, not proof of a meaningful event; the model still has to interpret it, and can miss small text or misunderstand a scene. Game mode retains its one-minute minimum and all conversation pauses remain active. Detection is occasional, not instant: normal Chatty/Balanced/Minimal checks use 18/45/120-second intervals; new foreground/file events may prompt after eight seconds. Nothing needs to be typed to trigger a reaction.

## Connected conversations and little habits

Local AI manual replies now retain up to ten recent conversation messages from the last 20 minutes, even when you switch apps. Human messages keep up to 1,200 characters instead of being squeezed into a 280-character history excerpt. The human’s question defines the topic; current screen/file context is used when relevant. A short answer can respond to a question he asked in another app within three minutes. Once you answer, that starter joins the recent conversation so the next reply can follow it. Older saves without message timestamps are kept in the save but are not treated as a fresh topic.

Say **“new topic: …”**, **“never mind”**, or **“forget that”** to begin a new thread. Settings → **Forget recent conversation** clears saved messages and suppresses a pending answer. Failed sends restore the previous conversation and leave your text ready to retry. Automatic observations continue to exclude manual history; this change adds no extra automatic AI calls. Follow-up instructions ask the model to answer first, acknowledge an answer, and ask at most one specific question when useful. Actual wording depends on the local model; built-in replies remain simple file observations.

**Little habits** are enabled by default, with their own Settings toggle and silent Creature previews: **Stretch**, **Groom**, and **Get comfy**. Habits start after 30–50 seconds of free time, last six to eight seconds, and then wait about 55–90 seconds (75–110 for Cozy) before another opportunity. They wait for a stationary moment. Playful favors stretches; Curious and Cheeky favor grooming; Cozy favors settling down. Consecutive desktop habits vary. Busy interruptions delay the next opportunity by at least 30 seconds.

Habits add no speech, AI call, screenshot, reward, or stat penalty. Typing, chat, active bubbles, physical reactions, dragging, fetch, naps, focus, and being away or hidden take priority. In games, automatic habits use a still comfy pose; game and reduced-motion previews also stay still. The dragon’s outer position and bubble anchor remain fixed. Cosmetic habits also work with PC awareness off and in Quiet mode.

## Physical reactions

Physical reactions are on by default for existing saves, with an independent Settings toggle. New file observations can trigger a curious lean and head tilt. Automatic local-model observations can pair a discovery with curiosity, a visible error with a surprised face/startle, or explicit result text with a small celebration. Completed focus sessions also celebrate. Creature → Try a reaction previews all three without Ollama; previews are clearly practice poses and do not imply an actual game result.

The same automatic request returns a short reply and an event/evidence label. Labels stay out of the speech bubble and saved chat. An error or victory reaction requires a current screenshot plus supporting evidence text; filenames alone cannot trigger those poses. Uncertain, missing, unknown, contradictory, or silence labels use no reaction. Model-provided evidence can still be wrong, so actual recognition requires on-PC testing. A local server rejecting the format gets one compatibility attempt; plain replies still work with no guessed reaction.

Poses last about four seconds and have a 12-second cooldown; game poses last three seconds with a one-minute cooldown. Sleep, dragging/tossing, fetch, typing, focus, and open manual conversations take priority. Opening chat, switching foreground context, or disabling reactions cancels the pose. The artwork moves inside the dragon, so speech bubbles stay anchored. Games and reduced-motion mode use static poses, with no reaction hops or extra roaming. Reactions add no extra model request or screen capture.

## Personality

Settings → General → Dragon personality offers **Playful**, **Curious**, **Cozy**, and **Cheeky**. Playful is the default for old saves. Personality changes local AI tone, built-in activity comments, greetings, affection, snacks, fetch, and naps. Hear a little personality previews a line without needing Ollama. Cozy is calmer; Cheeky uses gentle mischief rather than insults. Short-reply limits and grounded observations still apply. The live local model determines wording; the prompt cannot guarantee perfect tone.

## Game mode and disappearing behind a game

Game mode defaults to Automatic. Recognized games/launchers, or an unrecognized foreground app covering a monitor, activate it. A fullscreen browser does not become game mode. Settings → Games also offers Always on for unrecognized windowed games and Off for normal behavior.

In game mode, the dragon is smaller, stays in a chosen corner, stops wandering/chasing, pauses fetch, and uses quieter spectator commentary. Keyboard/mouse idle does not put him to sleep while game mode is active, because controller play can appear idle to those sensors. Click through dragon is on by default; the launcher and opened controls still receive clicks. Turn it off to click/drag the dragon while gaming. PC awareness must be on for automatic detection; forced On works without automatic sensing.

The desktop overlay reasserts its higher always-on-top level when entering/changing a fullscreen game and periodically while immersive activity is present, without calling focus. Follow game monitor uses transient monitor geometry, converts physical coordinates to Electron DIP coordinates, and follows the foreground game's display. Fullscreen game overlays use the display's full bounds. On leaving game mode, the chosen desktop monitor/work area and normal behavior return. A tray monitor move overrides automatic following until game mode ends. Manual hide stays hidden until explicitly restored.

If he disappears behind a game, press **Ctrl + Shift + G**, use Tray → Bring dragon over game, or the Settings recovery button. If he remains invisible, set the game display mode to **Borderless Fullscreen** or **Windowed**. An ordinary desktop window cannot reliably cover every exclusive-fullscreen game or protected rendering surface. This update improves desktop overlay stacking and monitor matching; real game visibility still needs testing on your PC. It does not inject into games or promise compatibility with every game.

## Click to talk

Click the creature to open a small message box, type a question, and Send. The reply appears above him and the input closes. Escape dismisses the input. Wandering and automatic comments pause while you type. Automatic chatter also pauses for 90 seconds after a manual reply, and automatic questions leave two minutes to answer. File events and idle returns cannot replace a conversation bubble. Startup and automatic wake-ups are silent. AI greeting prefixes are stripped before the one-sentence limit, retaining the observation; greeting-only automatic replies are suppressed. Your response can use his latest automatic comment for up to three minutes when the foreground still matches, or a short answer can follow a recent question across apps. An answered starter then joins the explicit conversation; unattended automatic comments stay out of saved history. File/folder controls and project memory now live under **Settings → Projects**. Automatic comments need no message or open panel.

## What works in this version

- Smooth movement follows display refresh instead of the previous 30 FPS cap. Settings also offers an optional 30 FPS economy mode and a measured frame-rate indicator. Movement uses composited transforms and cached geometry; unchanged labels and animation classes are no longer rewritten every frame.
- Cursor curiosity: eyes follow movement; quick nearby movements can prompt a playful chase and dizzy reaction.
- Typing buddy: a tiny keyboard appears during typing activity and disappears when it stops.
- Activity outfits: glasses for recognized coding tools, headphones for music apps, and a helmet for recognized games/launchers. Your purchased hat remains selected and returns afterward.
- Idle naps and silent wake-up on return, with a configurable 1/2/5-minute idle threshold. Manual naps and focus sessions retain priority.
- All activity reactions can be disabled together or individually.
- Original animated vector dragon: breathing, blinking, tail movement, walking, napping, and happy reactions.
- Click to talk. A small message box appears beside the creature; replies appear in the speech bubble, with at most two sentences and 40 words. There is no Talk tab or conversation feed. Drag to pick up, release to drop or toss, and right-click for controls. Enter/Space also opens the message box. Give love in Creature controls still pets and rewards the dragon.
- Fetch with a bouncing ball: the dragon runs to catch it and earns coins.
- Snacks restore energy; naps restore energy gradually while the app is open.
- Happiness, energy, friendship, and coins persist on this device. There is no decay while the app is closed.
- Three color palettes, naming, and a wardrobe with a sprout, crown, and wizard hat.
- Focus sessions from 1 to 180 minutes, pause/resume, a floating countdown, and completion rewards. Your dragon wears glasses and stops wandering during a running session.
- Up to 20 reminders; delivery while the app is running, including when its desktop overlay is hidden. Reminders do not wake a closed app. Overdue reminders appear on reopening.
- A notebook that saves automatically.
- Quiet mode, wandering toggle, reduced motion, and the system reduced-motion preference.
- Native desktop shell: transparent overlay, click-through outside the companion controls, tray menu, monitor switching, and show/hide shortcut.

Interaction rewards: petting earns 1 coin with a 2.5-second reward cooldown; fetch earns 3; a completed focus session earns 15. Snacks and naps are free. Clothing costs 10/30/50 coins and remains owned permanently.

## Desktop controls

| Action | Control |
| --- | --- |
| Send a quick message | Click the dragon, Enter, or Space; type and Send |
| Pet the dragon | Creature → Give love |
| Pick up / toss | Drag and release |
| Open controls | Companion button, right-click dragon, or tray icon |
| Close controls | × or Escape |
| Show / hide creature | Ctrl + Shift + P, or tray menu |
| Bring dragon over a game | Ctrl + Shift + G, tray recovery, or Settings → Games |
| Change monitor | Tray → Move to next monitor |
| Exit completely | Tray → Quit Pocket Creature, or Settings → Quit app |

The overlay covers one monitor's work area. You move the creature within it by dragging. With Window perching enabled, he can sit on the top edge of a restored window with enough headroom and follow it as it moves. The hotkey is best-effort; if another app has reserved it, use the tray.

## Window perching

Enable **Settings → Window perching** and PC reactions. When a restored foreground window stays still for two seconds, the dragon moves onto its top edge if there is enough room above it. He follows that window’s position and width. The Windows helper refreshes geometry twice a second, including while companion controls have focus; the renderer eases the movement between updates. Perching follows the selected overlay monitor, not every open window at once.

Maximized, fullscreen, minimized, hidden, closed, or unsuitable windows have no usable perch; he returns to desktop behavior. Game mode takes priority. New automatic perches wait during typing, chat, focus, sleep, play, and dragging. An existing perch can remain while he rests or talks.

Drag him away to give him a 45-second break from automatic perching. Drop his feet within 30 pixels of a usable top edge to seat him there manually. Settings has a preview window in the browser playground, including move and close controls. That preview demonstrates behavior without sensing other browser windows. Native Windows tracking and mixed-DPI accuracy still need PC testing.

## Personal memory

Personal memory is enabled by default and starts empty. It records clear first-person statements you send, such as “Call me Noodle,” “My favorite game is Stardew Valley,” “My hobbies are drawing,” “I like cozy games,” or “I dislike spoilers.” It recognizes a small set of literal phrases; it does not infer preferences from screenshots, opened files, someone else’s words, or AI replies. New statements replace the corresponding field rather than building an unbounded profile.

Under **Settings → Memory**, inspect or edit the nickname, favorite games, interests, likes, and dislikes. **Save details** applies changes. **Forget personal details** clears the profile and recent conversation so an old reply cannot recreate it. Editing, forgetting, and pausing memory also discard a pending reply; pausing keeps the saved profile but stops learning and using it. Resume to use those details again. Project memory is a separate feature.

Ask “What is my favorite game?” or “What do you remember about me?” for direct local recall, even without Ollama. Unknown facts stay unknown. When enabled, saved details accompany manual local-model replies only; automatic screen/app comments stay grounded in the current activity. Model tone and relevance still need a live Ollama check.

## Data and implementation

The desktop app saves `companion.json` under Electron's user data folder (under `%APPDATA%`, normally `pocket-creature` or `Pocket Creature`, depending on launch mode). The browser demo uses localStorage. These saves contain settings, stats, wardrobe ownership, notebook text, reminders, focus deadlines, explicit or automatically observed project memories, forgotten-project markers, theme choices, and recent conversation, personal memory, personality, game-mode preferences, and home position/owned decorations/routine preferences. Connected folder paths are saved separately in `connected-folders.json`. File samples themselves are not saved, though conversation messages may quote file observations or content. The Windows helper observes the foreground process name and aggregate key-down activity counts while reactions are enabled. It never reads key codes or typed characters. It reads the current foreground window title to notice supported editor filenames and follow browser tabs/game windows. A bounded title and changing activity identifier reach the renderer and local model as transient context. Raw titles are not saved, though a reply can mention an observed title. Resolved file context or an unread filename observation also reaches the renderer. Raw process names become a coarse category inside the adapter, and activity telemetry, window handles/geometry, monitor centers, and fullscreen observations are not written into your save. Screen capture is available only when Screen awareness is enabled and the selected local model supports vision. Optional push-to-talk opens the default microphone only while a button or shortcut is held, up to 20 seconds. Audio closes before offline recognition and remains transient in memory; recognized text sent into a conversation may be saved in recent history. Its helper polls only the configured F8/F9/F10 shortcut plus Ctrl/Shift, never ordinary typed characters. Optional Kokoro output calls a separate fixed loopback endpoint on port 8880. Optional local AI calls only a fixed localhost endpoint; the configured Ollama service and model determine their own behavior.

The renderer uses plain JavaScript ES modules with an original SVG character, CSS animation, and a small physics engine. There is no bundler required to modify it. Electron supplies the native desktop shell. The renderer is sandboxed, Node integration is disabled, and only narrow, sender-validated IPC functions are exposed. Saved input is normalized, and notes/reminders are rendered as text.

```text
renderer/core.mjs       Saved state, focus logic, wardrobe, physics
renderer/app.mjs        Behavior, interactions, UI, reminders
renderer/speech.mjs     Speech policy, cancellation, delivery and local browser preview
renderer/voice-input.mjs Capture epochs, transcript review and conversation state
renderer/voice-commands.mjs Explicit local creature requests and voice pose selection
desktop/voice-input.cjs Microphone helper lifecycle and watchdogs
desktop/voice-input.ps1 Held shortcut, bounded capture and offline recognition
desktop/local-voice.cjs Fixed-loopback Kokoro discovery and bounded WAV synthesis
desktop/speech.cjs     Bounded Windows voice helper lifecycle
desktop/speech.ps1     Installed voice discovery and native speech output
renderer/companion.mjs  Sampled text inspection and dialogue
desktop/files.cjs       Scoped file reads and editor-title resolution
desktop/chat.cjs        Model discovery and fixed-localhost model adapter
desktop/screen.cjs      Transient capture of the selected monitor
renderer/autonomy.mjs  Automatic conversation scheduling and factual memory
renderer/conversation.mjs Recent manual thread selection and topic boundaries
renderer/habits.mjs    Silent personality habits and interaction priorities
renderer/perching.mjs  Transient window geometry and perching priorities
renderer/personal-memory.mjs Literal personal statements and bounded recall
renderer/index.html    Vector dragon and companion controls
renderer/style.css     Animations and playground styling
desktop/main.cjs       Overlay, tray, monitor selection, saves, notifications
desktop/preload.cjs    Narrow desktop bridge
desktop/activity.cjs   Windows helper lifecycle and app categorization
desktop/activity.ps1   Foreground title/monitor/fullscreen and count-only keyboard adapter
desktop/overlay.cjs    No-focus overlay recovery and game-monitor following
renderer/personality.mjs Character tones and short built-in reactions
tests/                 Logic tests and optional browser smoke suite
scripts/               Local demo server and standalone HTML builder
```

## Develop and verify

```powershell
npm ci
npm test
npm run demo
```

The playground runs at http://127.0.0.1:4173. Edit renderer files and reload. Rebuild the single-file demo with `npm run build:demo`. Build a portable Windows x64 executable with `npm run dist:win`. Linux and macOS distribution are not targeted in this release.

For the complete browser suite:

```powershell
npx playwright install chromium
npm run test:browser
```

It starts/stops its own local server on port 4173, runs ten suites, and generates preview screenshots. Stop an existing demo first. On Linux, use `npx playwright install --with-deps chromium` if system dependencies are needed. See [QA.md](../QA.md) for recorded checks and outstanding native verification, and [CONTRIBUTING.md](../CONTRIBUTING.md) for development conventions.

## Activity detection

The browser preview reacts only to cursor/typing/idle activity within its page. Use the Creature tab’s activity preview selector to try coding, browsing, music, gaming, stepping away, and returning.

On Windows, a bundled PowerShell/C# helper obtains foreground process names and counts key-down events. It uses no administrator elevation and records no typed content. Disabling Typing buddy stops the keyboard hook; disabling all reactions stops the helper. The helper exits with the companion. If Windows policy blocks the helper, cursor and idle reactions remain available and the controls show that app/typing signals are unavailable.

Recognized categories include VS Code/Cursor/Visual Studio and common IDEs, Spotify/iTunes/VLC, selected games and Steam, and major browsers. Browser-tab titles are observed; page visuals require Screen awareness. Music beats are not inspected. A game or music outfit reflects a foreground app category. Optional vision supplies occasional visual context; exact gameplay events still require dedicated integrations. Native integrations need a Windows run before being considered verified.

## Next

See [ROADMAP.md](../ROADMAP.md) for the expansion plan. Music integration, launch shortcuts, multiple creatures, and reliable game-event telemetry remain future work. Local AI is optional and user-configured.

## Spoken replies — 0.11

Open Settings → Voice. Click Refresh voices, select an installed voice (or Windows default), and try Test voice before enabling Spoken replies. Adjust Volume and Speaking pace; Expressive pace adds gentler sleepy/cozy delivery and slightly livelier playful delivery. This changes delivery, not the amount of dialogue generated.

Replies only reads care, manual chat, focus completion, and reminders. Balanced also reads occasional existing automatic bubbles at least 45 seconds apart; More often lowers that limit to 15 seconds. Existing quietness, focus, idle, and conversation safeguards still apply. Speak during games is off by default; when enabled, automatic lines stay at least a minute apart. Quiet mode mutes every voice, including the test.

Stop voice appears while speech is preparing/playing and remains usable with game click-through. You can also use the Settings stop button, Ctrl + Shift + M, the tray action, or Escape in the companion. Opening quick talk, dragging, hiding, or quitting stops speech. Automatic speech stops when the foreground context changes. A new reply replaces current speech; there is no playback queue.

Windows output uses the bundled PowerShell/System.Speech helper and installed SAPI voices. Text is sent as plain JSON on stdin, spoken as text, and never interpreted as commands or SSML. No audio is recorded or saved. Each line may take a moment while the Windows helper starts. Voice works without Ollama; model responses are still generated by the selected conversation engine. If voice is unavailable, try Refresh voices, another installed voice, your Windows output device/volume, or installing a speech voice in Windows Settings. Some Narrator voices are not exposed to SAPI. Windows policy can block the helper; text bubbles still work.

The browser playground only uses voices marked local by the browser. It reports unavailable when none are offered, rather than choosing a remote voice. Click Test voice to allow playback in browsers that require a user gesture. Actual Windows sound/quality has not been verified on the Linux build host. The browser playground does not capture a microphone or call Kokoro.


## Voice animation and dragon sounds — 0.22

Kokoro mouth opening follows the playing WAV samples, including silent gaps and buffering. Windows voices supply native mouth-position events when available, with approximate word-timed movement for voices that supply only word boundaries. Browser voices use word timing; a voice without timing keeps a still mouth. Stopping or replacing speech clears old animation events. Games and reduced motion keep the mouth still.

Open **Settings → Voice → Dragon expressions & sounds** to turn speaking gestures/personality posture on or off. Small nods and paws follow phrase starts; cozy relaxes, curious leans in, cheeky gives side glances, and playful adds light emphasis. Motion level scales them. Movement, typing, microphone capture, tricks and other action poses take priority. This does not generate more dialogue or change speaking pace.

**Little dragon sounds** starts off and has its own volume control. Enable it and try a chirp. Care can produce happy squeaks, play a chirp, and sleep a soft yawn. Sounds are synthesized locally and muted during speech, microphone activity, focus, quiet mode and games. They do not require Windows voice or Kokoro. Existing save progress and preferences remain compatible.

## Voice conversations — 0.12

### Talk to him

1. Quit the older copy from its tray and open the new build. Keep Ollama running for local-model answers.
2. Open Settings → Voice. Leave Windows selected, Refresh voices, choose your installed voice, and Test voice. Enable Spoken replies to hear conversation answers.
3. Enable Push-to-talk. Hold **Ctrl + Shift + F9**, speak, then release. The Hold to talk buttons work the same way. Choose F8 or F10 if another app uses F9.
4. The dock shows Listening, Recognizing, Thinking, and Speaking. The microphone is closed before recognizing begins. A take is limited to 20 seconds; reaching the limit closes capture and requires review.
5. If words are uncertain, use Review to edit them in quick talk and send. Enable Review before sending to check every take. An empty take creates no message.

Recognized text is sent through the existing conversation path. Local AI mode uses the configured Ollama model; offline mode keeps its existing built-in replies. This update adds conversation input, rather than a separate voice-command grammar. In games, enable Speak during games if you want answers aloud. The overlay still follows existing borderless/windowed-game limitations.

Cancel discards the current take and pending answer. Escape, opening quick talk, dragging, hiding, Quiet mode, disabling push-to-talk, lock/sleep, renderer crash, or quitting stop capture. Held keys must be released before another capture. Speech output is blocked while listening/recognizing so he cannot record his own voice. Repeat last reply replays the most recent bubble without another AI call; it is unavailable during recording/recognition and cleared when conversation history is forgotten.

### Natural local voices (optional)

Kokoro is a separate local service, not included in the companion or installed automatically. With Docker Desktop installed and running, run this command once in PowerShell:

```powershell
docker run -d --name pocket-kokoro -p 127.0.0.1:8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

The initial image/model download needs internet and may take a while. Once the service is ready, choose Kokoro in Settings → Voice, Refresh voices, select a voice such as af_heart, and Test voice. Requests stay at `http://127.0.0.1:8880`; the companion does not accept remote speech hosts. Official service setup: [Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI).

After restarting Docker, start an existing container with `docker start pocket-kokoro`. Stop it with `docker stop pocket-kokoro`; do not rerun the create command with the same container name. Keep Windows selected whenever you prefer installed voices or the service is offline. Kokoro keeps a separate selected voice. The app waits for a complete WAV, capped at 8 MB/45 seconds; CPU speed affects the delay before playback. No generated audio is written to disk by the companion. The separately installed service has its own behavior/settings.

### If recognition or sound is unavailable

- Allow microphone access for desktop apps in Windows Settings → Privacy & security → Microphone, select a working default input device, and check that an offline Windows speech recognizer for your language is installed. Installing a spoken-output voice alone does not install a speech recognizer. Restart the companion after installation.
- After a helper timeout or device change, toggle Push-to-talk off/on to reconnect. If Windows policy blocks PowerShell or System.Speech, text conversations remain available.
- Quiet mode pauses input and mutes output. Games mute output until Speak during games is enabled. Recognition uses the recognizer closest to Windows' UI language, falling back to an installed recognizer if needed.
- Refresh voices after changing engines. Kokoro offline means the local service is not ready; Windows voice availability is independent of Ollama and Kokoro.

Windows recognition/audio, native shortcut behavior, and live Kokoro quality/latency still require a Windows run. Browser and unit tests use native mocks; synthetic WAV playback verifies the renderer path only. The new helper can be compile-checked without opening the microphone using `powershell -NoProfile -File scripts/verify-windows-helper.ps1`.


## Companion layout — 0.13

Open Companion or right-click your dragon. Creature keeps care/play visible; expand Style your dragon for color/wardrobe or Activity & little tricks for previews. Focus and Notes retain their dedicated pages.

Settings opens a focused page instead of one long list. General contains theme/name/personality/motion, Voice contains spoken replies and push-to-talk, Local AI contains connection/model and automatic conversation/screen choices, Activity contains PC/cursor/typing/outfit/nap/perching behavior, Games contains overlay choices, Memory contains personal details and recent-conversation clearing, Projects contains file/folder and project memory controls, and Privacy explains observed data and app controls. Quiet is always available in the bottom bar.

Search for a word such as “voice”, “typing”, or “nickname” to jump to a setting. Selecting a result opens its page, expands any advanced group, highlights the control, and moves keyboard focus there. Escape clears the current search; a second Escape follows the existing close/cancel behavior. Arrow keys move between settings categories when their navigation has focus. Scrolling content keeps the main navigation and bottom bar visible; each category keeps its scroll position for the current visit.

Voice → Delivery & game options holds pace, spoken-comment frequency, expression, and Speak during games. Kokoro setup and voice help expand on demand. On small desktops, the panel leaves room above the voice dock; on wide desktops the dock moves to the other side while the panel is open. New build preferences use the existing save schema 10, so earlier progress remains available.


## Creature commands — 0.14

With Push-to-talk enabled, hold the shortcut/button, speak, then release. These commands also work when typed into the speech-bubble input. Windows dictation still needs an installed recognizer; the actions themselves work without Ollama. Uncertain transcripts, or all transcripts when Review before sending is enabled, need review and Send first.

| Say | Result |
| --- | --- |
| “Take a nap” / “Wake up” | Sleep or wake; repeated requests preserve the state |
| “Give him a snack” / “Give him a pet” | Care action using existing rewards/cooldowns |
| “Play fetch” | Start fetch when focus and game mode are off |
| “Start a 25-minute focus session” | Start a timer; spoken “twenty five” also works |
| “Start focus” | Use your selected focus duration |
| “Pause focus” / “Resume focus” / “End focus” | Control the current timer without completion rewards for cancellation |
| “Repeat that” | Replay the last bubble without another model request |
| “Stop talking” | Stop speech output |
| “Be quiet” | Enable Quiet, stop playback, and pause push-to-talk |

Focus accepts whole minutes from 1 to 180. An active/paused session must be ended before starting a different one. Starting focus clears fetch and wakes him. Quiet can be turned off using the Companion footer toggle; the microphone is paused while Quiet is on.

He leans toward you while listening, tilts his head while recognizing/thinking, and briefly nods after a successful action. Wandering, cursor chasing, and typing mimicry pause during voice input. Game mode and reduced motion use still poses. His overlay position stays anchored.

Only a whole-message explicit request is a command. “Why do you tell me to take a nap?”, quoted examples, negations, and combined requests remain conversation. Model replies never trigger actions. Creature commands stay out of recent conversation and personal memory; ordinary sent conversations follow the existing saving policy. There is no always-listening mode or new system-control permission.


## A little home — 0.15

Open **Creature → A little home**. The section starts closed to keep care controls easy to reach. Its preview shows your current corner; Beds, Rugs, Plants, Lamps, and Toys each show one compact category. Wicker bed, open floor, daylight, no plant, and the ball basket are free. Unlock other items using earned coins; purchases charge once and switching owned items is free. Progress from older builds is preserved.

**Move home** closes Companion and focuses the small Home handle. Drag it, or use arrow keys (Shift for larger steps); Enter/Space opens decorations. Escape cancels the current drag. Reset position returns it to its starting corner. Saved placement is relative to the current display area, clamped on resize, and shifts temporarily above the voice dock when needed. Art is click-through; only the Home handle takes desktop input.

Naps, including idle naps, send him to the bed before he curls up. Waking normally gives a five-second stretch when he is free. Starting/resuming focus clears fetch and settles him beside his bed. Games fold the whole home away while he stays in the spectator corner; leaving games restores it. You can keep decorating while game mode is on, but routine/move previews wait until it is off.

With **Home routines** and roaming enabled, a free dragon occasionally visits the basket, inspects it, then tosses and catches the equipped ball or star. The first opportunity is after about 65–90 seconds and later ones wait roughly 90–180 seconds; interruptions can postpone them. Solo play grants no coins, friendship, or happiness rewards. Typing, perching, reactions, conversations, held voice input, hiding, and dragging take priority. **Visit toy basket** and **Try a stretch** preview routines even when autonomous routines are off. Naps/focus still use the home with routines off. Turn **Show little home** off to keep using the original desktop behavior; owned items remain saved.

The existing offline command path also accepts **“go home”** (a nap at the visible home) and **“check your toys”**. Commands remain whole-message explicit requests; questions, quoted examples, negations, and combined requests remain conversation.

**Settings → Activity → Task gestures** adds short editor/browser/music poses, a still game-watching pose, and a paw stretch after a substantial typing burst pauses. Gestures wait for stable current context and have cooldowns. Turning PC reactions or Physical reactions off also disables them. Reduced motion and game mode use still artwork. Music gestures identify the music app category, without audio or beat detection.

Built-in replies can name a changed foreground window title. They use a bounded transient title, respect existing talkativeness/conversation pauses, and do not claim to have read page or file contents. File inspection and optional vision remain separately controlled. No extra AI request or telemetry is added for the home or gestures. Home artwork and handle join existing overlay exclusions for screen-change detection.


## Desktop launch recovery — 0.15.1

If 0.15 shows a full playground without your dragon and blocks desktop clicks, quit that copy using its tray menu or Task Manager, then run **Pocket-Creature-0.15.1-Windows.exe**. Keep your existing save. This patch fixes required modules being blocked by the desktop route.

The overlay stays hidden and click-through until the dragon and controls finish initializing. Opening tray controls during loading waits for that initialization. If startup cannot complete within 15 seconds, a page/preload fails, or the renderer crashes/stops responding, the app hides/releases the overlay and exits with an error message. The usual Ctrl + Shift + P show/hide and Ctrl + Shift + G recovery shortcuts remain available after startup.


## Living Companion — 0.16 local preview

Daily routines use your PC’s local time: morning 6–11, afternoon 11–17, evening 17–22, and night 22–6. They are silent and never start a nap while you are working. Playful tends toward hops, Curious peeks around, Cozy settles more slowly, and Cheeky explores a little faster. **Settings → Activity → Daily routines** can disable or preview them. Talking, typing, games, focus, dragging, home activity, and perching take priority.

**General → How much he moves** chooses Gentle, Normal, or Lively. Conversation frequency remains under Local AI; spoken chatter remains under Voice. Reduced motion pauses daily routines and wandering. New poses animate the artwork without moving the desktop hit area.

Page or document changes inside one window reset pending observations. Built-in commentary briefly recognizes a recent return, and local AI ignores a completed reply for an obsolete title. Titles only identify the activity; file contents still require showing a file or a connected folder, and screen interpretation still requires optional vision awareness.

Type or say **“remind me in 10 minutes to drink water”** or **“remind me in 2 hours to check the oven”**. These create local reminders with durations from 1 minute to 24 hours, up to 20 at a time. Notes/questions/quoted examples and model output never create reminders. They use the existing reminder clock and notification settings; the app must remain running to deliver them, and overdue reminders appear when reopened.

Mention homework or studying to get a focus offer under **Creature → A little help**. **Focus together** starts 25 minutes when you choose it. **Explain selected file** asks about the text/code file you showed. Helpful offers can be disabled in Activity; explicit buttons and reminders remain available.

**General → Startup & backups** enables Windows startup only for the packaged Windows app. Keep its executable in a permanent folder; moving/deleting it breaks the registration. When updating versions, disable startup in the old copy before enabling it in the new one. Windows Startup Apps can also disable an item, which the status reports. Registration is independent of your save and never changes just because you import a backup.

**Export save** writes a JSON backup containing name, progress, decor, preferences, notes, memories, reminders, and recent conversation. **Import save** accepts a supported backup smaller than 120 KB, shows the name/coins/sessions, and waits for **Replace current save**. Cancel leaves progress unchanged. Restoration keeps this PC’s observation, microphone, speech, and automatic-conversation permissions. Folder grants remain local. Browser and desktop saves are separate; JSON export/import lets you transfer progress deliberately.

**General → Local connections → Check connections** refreshes Ollama, your selected voice engine, and Windows startup status. Ollama is checked periodically in local mode; Kokoro remains a separate local service that you start yourself. No new account, API key, background microphone, or hosted AI service is introduced.


## Little Adventures — 0.17 local preview

**Creature → Trick school** teaches Wave, Bow, Spin, and Hop. Select a trick and choose **Practice together**. Three completed practices unlock **Perform trick**; take a short breather between practices of the same trick. Learning saves automatically and travels with your JSON backup. Typing, dragging, switching tasks, talking, sleep, focus, and games interrupt practice without adding progress. There are no coin rewards or costs. Reduced motion uses still poses and keeps practice available.

Type or say **“practice wave”**, **“practice bow”**, **“practice spin”**, or **“practice hop”**. Once learned, use **“do a wave”**, **“do a bow”**, **“do a spin”**, or **“do a hop”**. These run locally without Ollama. Questions, negations, quotations, and combined commands remain conversation; model replies never execute tricks.

**Settings → Activity → Screen adventures** controls silent exploring. Automatic adventures require Wandering; Gentle/Normal/Lively and personality affect their pace. **Try an edge peek** explores the screen edge and comes back. **Explore window edge** moves along a usable current perch, climbs a short distance down/up its edge, peeks, and returns. Move the window and the route uses its updated geometry; losing the surface cancels the route. **Stop adventure** cancels it immediately. Peeks stay inside the overlay; the companion does not actually hide behind Windows’ taskbar or other applications.

A usable perch requires PC awareness, window perching, and a restored window with room above its top edge. Maximized/exclusive-fullscreen/clipped windows do not provide a climbing route. In the browser playground use **Try a preview window** under Window perching. On Windows, underlying clicks remain available outside the companion’s existing interactive regions. Adventures introduce no new screen-reading service or permissions and pause for typing, conversation, other routines, focus, games, hidden/away state, and reduced motion. A return peek can wait up to 15 seconds for the wake-up stretch to finish.

The **attention badge** appears when the Companion panel is closed and hides in games. Click it to open **Creature → Activity & little tricks → Current attention**. A window title does not mean its contents have been read. **Filename only** means the companion has not read the file. **Read text sample** means the inspected text/code sample is available; a partial sample is explicitly identified. Unknown or stale activity is shown as waiting rather than guessed. Push-to-talk, conversation, focus, and rest take priority. A title change within one window ends the old file’s automatic grace period; explicit file questions remain available.

Turn off **Attention badge** in Activity to hide it. This does not turn off PC awareness, file access, or optional snapshots; use their existing settings for that. The badge is excluded from optional AI screen captures so it cannot become its own observed task. Attention titles and route positions are transient and are never added to the companion save or memories by these features.


## Expressive Companion — 0.18 local preview

Open **Creature → Little moments**. **Expressive moods** adds facial expressions derived from care, energy, personality, play, focus, and real achievements. Head scratches show affection; completing a learned trick or a focus session brings brief pride. Game wins are not inferred. Existing voice, reaction, routine, and trick poses have priority over these faces.

Choose **Head scratch**, **Offer a paw**, **Bring a toy**, or **Settle nearby**, then **Try this moment**. Use **Stop moment** to cancel. A toy visit requires a visible home and an unperched creature. He walks to the current basket, collects the equipped ball/star, and returns to his starting position. Moving the home updates the collection target; hiding the home or an interruption cancels the visit. Reduced motion shows a still toy pose with no travel.

Automatic paw offers, settling, and toy visits wait until idle and yield to typing, conversations, focus, sleep, games, dragging, and other activities. Toy travel follows Wandering; quiet stationary moments remain available with Wandering off. These moments are silent and add no coins, friendship rewards, or AI requests. Disable **Little interactions** to pause both previews and automatic moments. Preferences travel with your saved progress and JSON backup; moment coordinates and temporary emotions are not saved.

Automatic commentary pauses while you type, focus, or read another bubble. A reply already being prepared is discarded if typing starts. A question protects the topic for five minutes and its context remains available for ten minutes, including short answers after switching apps. Answering clears the question pause; the usual 90-second manual conversation pause follows. Explicit **new topic** requests clear the old question. Similar delivered observations are suppressed for ten minutes; rejected/interrupted replies do not consume that repeat history. Manual answers and reminders retain their existing behavior.


## Dragon looks and smooth motion — 0.19–0.21

Open **Creature → Style your dragon** for Original, Cloud Drake, Night Wyvern or River Dragon. All four are free and keep your personality, colors, hats and progress. **Try his animations** previews a little stroll, wing stretch, tail wiggle or soft bounce in place. Motion level scales the animation; games and reduced motion keep it still. Walking, landings, blinks and idle movement use shared joints, with eased transitions between poses.

Reactions wait for foreground context to settle and for a pause after typing. Replaced file events and stale observations are discarded. A new task should not cut off an ongoing conversation; existing conversation protections remain active.

## Our bond and favorites — 0.23

Open **Creature → Our bond** for learned favorites, progress and friendship gestures. **Edit favorites & learning** contains the next-snack selector, manual favorite pins, favorite games and learning controls. Select Berry bites, Honey crisps or Moon cookies, then use Little snack. Three visits at least a minute apart teach care/play preferences. Give love, completed fetch catches and completed manual moments count; automatic solo play, interrupted moments and gesture previews do not.

Favorite snacks get a short care reply, Enjoy favorite moment repeats the chosen activity, and eligible quiet moments lean toward a favorite. A pinned choice stays as you chose it. No favorite hides that category's preference. Forget care & play favorites clears evidence and pauses learning until you enable it again.

Favorite games share Personal memory. Tell him a clear favorite in chat or edit it here. Games are not inferred from titles/screenshots and remain unused in replies while Personal memory is paused. Editing or forgetting games also clears recent conversation; Forget games clears the shared field on both pages.

Existing friendship unlocks Tiny nuzzle (10), Paw promise (25), Wing hug (50) and Happy flourish (100) without replaying old notices. Newly crossed tiers announce once through a toast. Try gestures while he is settled on the ground; they stay in place and earn no extra rewards. Conversation, typing, voice, focus, sleep, dragging, games and reduced motion retain priority. Bond settings and evidence are included in save backups.
