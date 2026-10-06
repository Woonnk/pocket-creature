# Pocket Creature

A little company. A little chaos. A tiny animated dragon for your Windows desktop.

**Version 0.10.0 — window perching and editable personal memory.** No account, API key, or paid AI service is required.

## Try it

**Windows:** Run `Pocket-Creature-0.10.0-Windows.exe`, the separate portable download. It launches over your desktop. Open its controls from the **Companion** button or tray icon. The app is unsigned. The new 0.10 behavior is tested with mocks and needs a run on your Windows PC; earlier user screenshots confirm the overlay, readable themes, and live Ollama replies. See [QA.md](../QA.md) for remaining native checks. Quit the old version from its tray before launching this update; existing progress stays in the same desktop save location.

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

Supported editor titles now trigger filename curiosity even without a connected folder. **Settings → Files & memory → Connect folder** permits automatic inspection of files opened in VS Code, Cursor, Notepad, or Notepad++. Saved changes refresh the sample. Unsaved editor buffers are not read. Unresolved or duplicate filenames produce filename-only observations and are explicitly marked unread. **Show a file** remains an optional manual shortcut, including in the browser playground.

Turn on **Settings → Screen awareness** once to include occasional snapshots of the companion's selected monitor with a connected vision model. Snapshots include whatever is visible on that display, including other applications. The switch defaults off. Screen checks run only during eligible automatic observation attempts; no separate capture loop runs while you chat, sleep, hide the dragon, or use quiet mode. Images are sent only to the fixed local Ollama endpoint and never written to disk or saved state. Automatic snapshots are bounded to 960 × 540; manual snapshots to 1,280 × 720. One previous automatic snapshot is held in RAM to compare the next view, then replaced; switching foreground context, turning off screen awareness, hiding, going idle, or quitting clears it. Image access needs PC awareness on and a model advertising vision support. Screenshots can support observations about browsers, apps, or games; this is not continuous video or reliable game telemetry. Screenshots and file content are reference data, and the model has no ability to execute code or click.

Automatic project memory saves observed project filenames and recognizes statements such as “I'm building a horror game” in your conversation. It uses observations and your statements rather than model-invented facts. The expandable Project memory section lets you inspect or edit the description. Forget project removes the saved facts and prevents immediate automatic recreation for that project until you explicitly save a description again. Forget recent conversation in Settings separately removes the last 20 explicit conversation messages. New automatic observations are shown only in bubbles; a starter enters saved history only when you explicitly answer it. Raw file samples and screenshots are not saved, but conversation messages can quote observations or content.

At the top of the Companion panel, **Appearance** switches Dark (default), Light, Midnight Blue, Forest Green, or Follow Windows. The palette covers the panel, text, inputs, buttons, speech bubbles, launcher, and timer. Follow Windows responds to system color preference changes. Theme choice persists locally.

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

Settings → Dragon personality offers **Playful**, **Curious**, **Cozy**, and **Cheeky**. Playful is the default for old saves. Personality changes local AI tone, built-in activity comments, greetings, affection, snacks, fetch, and naps. Hear a little personality previews a line without needing Ollama. Cozy is calmer; Cheeky uses gentle mischief rather than insults. Short-reply limits and grounded observations still apply. The live local model determines wording; the prompt cannot guarantee perfect tone.

## Game mode and disappearing behind a game

Game mode defaults to Automatic. Recognized games/launchers, or an unrecognized foreground app covering a monitor, activate it. A fullscreen browser does not become game mode. Settings → Game mode also offers Always on for unrecognized windowed games and Off for normal behavior.

In game mode, the dragon is smaller, stays in a chosen corner, stops wandering/chasing, pauses fetch, and uses quieter spectator commentary. Keyboard/mouse idle does not put him to sleep while game mode is active, because controller play can appear idle to those sensors. Click through dragon is on by default; the launcher and opened controls still receive clicks. Turn it off to click/drag the dragon while gaming. PC awareness must be on for automatic detection; forced On works without automatic sensing.

The desktop overlay reasserts its higher always-on-top level when entering/changing a fullscreen game and periodically while immersive activity is present, without calling focus. Follow game monitor uses transient monitor geometry, converts physical coordinates to Electron DIP coordinates, and follows the foreground game's display. Fullscreen game overlays use the display's full bounds. On leaving game mode, the chosen desktop monitor/work area and normal behavior return. A tray monitor move overrides automatic following until game mode ends. Manual hide stays hidden until explicitly restored.

If he disappears behind a game, press **Ctrl + Shift + G**, use Tray → Bring dragon over game, or the Settings recovery button. If he remains invisible, set the game display mode to **Borderless Fullscreen** or **Windowed**. An ordinary desktop window cannot reliably cover every exclusive-fullscreen game or protected rendering surface. This update improves desktop overlay stacking and monitor matching; real game visibility still needs testing on your PC. It does not inject into games or promise compatibility with every game.

## Click to talk

Click the creature to open a small message box, type a question, and Send. The reply appears above him and the input closes. Escape dismisses the input. Wandering and automatic comments pause while you type. Automatic chatter also pauses for 90 seconds after a manual reply, and automatic questions leave two minutes to answer. File events and idle returns cannot replace a conversation bubble. Startup and automatic wake-ups are silent. AI greeting prefixes are stripped before the one-sentence limit, retaining the observation; greeting-only automatic replies are suppressed. Your response can use his latest automatic comment for up to three minutes when the foreground still matches, or a short answer can follow a recent question across apps. An answered starter then joins the explicit conversation; unattended automatic comments stay out of saved history. File/folder controls and project memory now live under **Settings → Files & memory**. Automatic comments need no message or open panel.

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
| Bring dragon over a game | Ctrl + Shift + G, tray recovery, or Settings → Game mode |
| Change monitor | Tray → Move to next monitor |
| Exit completely | Tray → Quit Pocket Creature, or Settings → Quit app |

The overlay covers one monitor's work area. You move the creature within it by dragging. With Window perching enabled, he can sit on the top edge of a restored window with enough headroom and follow it as it moves. The hotkey is best-effort; if another app has reserved it, use the tray.

## Window perching

Enable **Settings → Window perching** and PC reactions. When a restored foreground window stays still for two seconds, the dragon moves onto its top edge if there is enough room above it. He follows that window’s position and width. The Windows helper refreshes geometry twice a second, including while companion controls have focus; the renderer eases the movement between updates. Perching follows the selected overlay monitor, not every open window at once.

Maximized, fullscreen, minimized, hidden, closed, or unsuitable windows have no usable perch; he returns to desktop behavior. Game mode takes priority. New automatic perches wait during typing, chat, focus, sleep, play, and dragging. An existing perch can remain while he rests or talks.

Drag him away to give him a 45-second break from automatic perching. Drop his feet within 30 pixels of a usable top edge to seat him there manually. Settings has a preview window in the browser playground, including move and close controls. That preview demonstrates behavior without sensing other browser windows. Native Windows tracking and mixed-DPI accuracy still need PC testing.

## Personal memory

Personal memory is enabled by default and starts empty. It records clear first-person statements you send, such as “Call me Noodle,” “My favorite game is Stardew Valley,” “My hobbies are drawing,” “I like cozy games,” or “I dislike spoilers.” It recognizes a small set of literal phrases; it does not infer preferences from screenshots, opened files, someone else’s words, or AI replies. New statements replace the corresponding field rather than building an unbounded profile.

Under **Settings → Personal memory**, inspect or edit the nickname, favorite games, interests, likes, and dislikes. **Save details** applies changes. **Forget personal details** clears the profile and recent conversation so an old reply cannot recreate it. Editing, forgetting, and pausing memory also discard a pending reply; pausing keeps the saved profile but stops learning and using it. Resume to use those details again. Project memory is a separate feature.

Ask “What is my favorite game?” or “What do you remember about me?” for direct local recall, even without Ollama. Unknown facts stay unknown. When enabled, saved details accompany manual local-model replies only; automatic screen/app comments stay grounded in the current activity. Model tone and relevance still need a live Ollama check.

## Data and implementation

The desktop app saves `companion.json` under Electron's user data folder (under `%APPDATA%`, normally `pocket-creature` or `Pocket Creature`, depending on launch mode). The browser demo uses localStorage. These saves contain settings, stats, wardrobe ownership, notebook text, reminders, focus deadlines, explicit or automatically observed project memories, forgotten-project markers, theme choices, and recent conversation, personal memory, personality, and game-mode preferences. Connected folder paths are saved separately in `connected-folders.json`. File samples themselves are not saved, though conversation messages may quote file observations or content. The Windows helper observes the foreground process name and aggregate key-down activity counts while reactions are enabled. It never reads key codes or typed characters. It reads the current foreground window title to notice supported editor filenames and follow browser tabs/game windows. A bounded title and changing activity identifier reach the renderer and local model as transient context. Raw titles are not saved, though a reply can mention an observed title. Resolved file context or an unread filename observation also reaches the renderer. Raw process names become a coarse category inside the adapter, and activity telemetry, window handles/geometry, monitor centers, and fullscreen observations are not written into your save. Screen capture is available only when Screen awareness is enabled and the selected local model supports vision. There is no microphone access. Optional local AI calls only a fixed localhost endpoint; the configured Ollama service and model determine their own behavior.

The renderer uses plain JavaScript ES modules with an original SVG character, CSS animation, and a small physics engine. There is no bundler required to modify it. Electron supplies the native desktop shell. The renderer is sandboxed, Node integration is disabled, and only narrow, sender-validated IPC functions are exposed. Saved input is normalized, and notes/reminders are rendered as text.

```text
renderer/core.mjs       Saved state, focus logic, wardrobe, physics
renderer/app.mjs        Behavior, interactions, UI, reminders
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

It starts/stops its own local server on port 4173, runs nine suites, and generates preview screenshots. Stop an existing demo first. On Linux, use `npx playwright install --with-deps chromium` if system dependencies are needed. See [QA.md](../QA.md) for recorded checks and outstanding native verification, and [CONTRIBUTING.md](../CONTRIBUTING.md) for development conventions.

## Activity detection

The browser preview reacts only to cursor/typing/idle activity within its page. Use the Creature tab’s activity preview selector to try coding, music, gaming, stepping away, and returning.

On Windows, a bundled PowerShell/C# helper obtains foreground process names and counts key-down events. It uses no administrator elevation and records no typed content. Disabling Typing buddy stops the keyboard hook; disabling all reactions stops the helper. The helper exits with the companion. If Windows policy blocks the helper, cursor and idle reactions remain available and the controls show that app/typing signals are unavailable.

Recognized categories include VS Code/Cursor/Visual Studio and common IDEs, Spotify/iTunes/VLC, selected games and Steam, and major browsers. Browser-tab titles are observed; page visuals require Screen awareness. Music beats are not inspected. A game or music outfit reflects a foreground app category. Optional vision supplies occasional visual context; exact gameplay events still require dedicated integrations. Native integrations need a Windows run before being considered verified.

## Next

See [ROADMAP.md](../ROADMAP.md) for the expansion plan. Voice control, music integration, launch shortcuts, multiple creatures, and reliable game-event telemetry remain future work. Local AI is optional and user-configured.
