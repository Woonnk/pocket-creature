# Pocket Creature

A tiny dragon that lives on your Windows desktop: a little company, a little curiosity, and occasional snack opinions.

**Version 0.15.1 · Voice, a little home, and the desktop startup fix — public beta.** Windows desktop behavior is still being verified before the stable 1.0 release. See [QA.md](QA.md) for tested behavior and remaining native checks.

![Pocket Creature browser playground](docs/screenshots/companion.png)

**0.15.1 fixes a desktop startup failure in 0.15:** missing module routes left the playground covering the desktop without the dragon. The overlay now waits for completed initialization and hides/releases input on startup failure, a crash, or an unresponsive renderer. Existing saves and home features remain.

## What he does

- Pet, feed, drag, toss, play fetch, and customize your dragon.
- Give him a movable home with a sleeping basket, toy basket, and coin-unlocked decorations.
- Watch him visit his toys, stretch after waking, and settle beside his bed for focus.
- Notice supported apps, typing activity, editor filenames, and idle time.
- Sit on a restored window’s top edge and follow it as it moves.
- Talk through short speech bubbles, with optional local Ollama replies.
- Optionally speak existing replies with local Windows voices, expressive pace, volume controls, and instant interruption.
- Hold a button or shortcut to talk using offline Windows recognition; release to send.
- Choose optional Kokoro local voices and repeat the last reply without another AI request.
- Keep recent conversations connected across app switches.
- Remember clear personal details you tell him, with editable/forgettable memory.
- Stretch, groom, and settle down with personality-specific silent habits.
- Keep a small, quiet corner during games; recover the overlay with Ctrl + Shift + G.
- Use five readable themes, four personalities, focus sessions, reminders, and a notebook.

### Window perching and personal memory

Browser playground previews are shown below. Native Windows perching and live-model personalization still require direct PC verification.

![Dragon perched on a preview window](docs/screenshots/perching.png)
![Editable personal memory](docs/screenshots/personal-memory.png)

## Try it

**Windows 10/11 x64:** download [Pocket-Creature-0.15.1-Windows.exe](https://github.com/Woonnk/pocket-creature/releases/download/v0.15.1/Pocket-Creature-0.15.1-Windows.exe) from the [0.15.1 beta release](https://github.com/Woonnk/pocket-creature/releases/tag/v0.15.1) and launch it. Quit an older copy from its tray first. Your local save stays in the same location. Use **Companion** or the tray for controls; click the creature for a message, drag to move, or right-click for controls. Ctrl + Shift + P shows/hides the creature. The executable is unsigned.

**Browser playground:** download and open [Pocket-Creature-Playground.html](https://github.com/Woonnk/pocket-creature/releases/download/v0.15.1/Pocket-Creature-Playground.html), or run the demo from source. It has simulated window perching and built-in file observations; PC-wide sensing and Ollama calls require the desktop app.

**Optional Ollama:** start Ollama on this PC and install a local model. Settings discovers installed models and reconnects automatically. Screen awareness requires a vision model and is off by default. No account or API key is required by the companion.

Open **Settings → Voice**, refresh/select an installed voice, test it, and enable **Spoken replies**. Enable **Push-to-talk**, then hold **Ctrl + Shift + F9** or **Hold to talk**; release to send a creature command or continue your conversation. Recognition uses an installed Windows speech recognizer and closes the microphone before transcribing. Uncertain words need review. Games mute spoken replies by default. **Repeat last reply** replays the last bubble without another AI call. Say “take a nap”, “give him a snack”, “start a 25-minute focus session”, “pause focus”, “resume focus”, “end focus”, “repeat that”, or “be quiet”. These commands run without Ollama and also work when typed. Listening/thinking poses and a confirmation nod show what he is doing. Command examples are under **Settings → Voice → Commands you can say**. Quiet pauses the microphone; use the toggle to turn it off again.

Windows voices need no separate service. Optional **Kokoro** voices need a local service installed separately; setup and troubleshooting are in the [voice guide](docs/guide.md#voice-conversations--012-local-preview). Ctrl + Shift + M stops output; Cancel in the voice dock stops the current voice conversation.


## A little home

Open **Creature → A little home** for a free wicker bed and ball basket. Spend earned coins on cushions, rugs, plants, lamps, and a star plush; each purchase unlocks permanently. Drag the **Home** handle or use its arrow keys to place the corner. Position and decorations survive restarts.

Naps send him to bed, waking brings a stretch, and focus brings a quiet settling pose. With roaming and Home routines enabled, he occasionally visits the toy basket and tosses a toy by himself. Solo play earns no coins. The home folds away during games and returns afterward. Use the routine toggle or tuck the whole home away whenever you like.

**Settings → Activity → Task gestures** adds brief browser/editor/music poses and a paw stretch after sustained typing pauses. Built-in comments can name a changed current window title; existing conversation pauses still apply. These use existing app/typing signals and need no extra AI request. Music poses notice the app category; they do not listen to audio.


## A calmer Companion panel

Care and play stay on the Creature page. Colors/wardrobe and activity previews expand when needed. Settings has separate General, Voice, Local AI, Activity, Games, Memory, Projects, and Privacy pages. Search jumps to a control; navigation and Quiet stay easy to reach. Themes live under Settings → General, with delivery/game voice tuning under Voice → Delivery & game options.


## Run from source

Use Node.js 24 and npm:

```sh
npm ci
npm run demo
```

Open the localhost URL printed by the demo. For the Windows desktop app, use `npm start` instead. More setup, controls, privacy details, and troubleshooting are in [the full guide](docs/guide.md).

## Develop and test

```sh
npm test
npx playwright install chromium
npm run test:browser
npm run dist:win
npm run check:release
```

The browser suite starts/stops its own local server. [CONTRIBUTING.md](CONTRIBUTING.md) explains Linux browser dependencies and development conventions. GitHub Actions covers Windows/Linux logic checks, browser regressions, C# helper compilation, and Windows package artifacts. Check the repository’s Actions tab for actual run results; prepared workflows alone do not establish native compatibility.

## Privacy and limits

Activity uses transient window titles/geometry, coarse app categories, idle time, and typing counts. Typed characters are not read. Text samples and screenshots are not saved; conversation may quote observations. Personal facts come from your messages or edits, never screenshots. Only manual replies receive personal memory. AI uses the fixed localhost Ollama endpoint.

Native geometry, mixed-DPI behavior, fullscreen games, and live-model accuracy remain subject to the checks in [QA.md](QA.md). Borderless/windowed games may be needed for visibility. A model can misunderstand a scene. Window perching needs enough room above a restored window on the overlay’s selected monitor; maximized/fullscreen windows and games take priority over perching.

## Project information

- [Roadmap](ROADMAP.md) and [changelog](CHANGELOG.md)
- [Release notes](RELEASE_NOTES.md) and [Release process and 1.0 preparation](docs/RELEASING.md)
- [Security/privacy reporting](SECURITY.md)
- [MIT license](LICENSE) and [third-party runtime notices](THIRD_PARTY_NOTICES.md)
