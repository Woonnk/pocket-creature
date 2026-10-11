# Changelog

## 0.23.0 — Bond & Favorites public beta

- Add a collapsed Creature → Our bond page with favorites, friendship progress, four milestone gestures, and a nested editor. Preserve all existing friendship, coins, looks, voice and other settings on schema 15.
- Learn favorite snacks from Berry bites, Honey crisps and Moon cookies, and favorite moments from deliberate care or completed manual play. Require three visits at least a minute apart; save cooldowns across reload. Interrupted and autonomous moments do not teach preferences.
- Recognize a favorite snack in care replies, repeat a favorite activity from the bond page, and favor eligible learned quiet moments during existing idle routines. No extra AI calls or reward changes.
- Allow manual pins, No favorite, and paused learning. Forgetting care/play favorites clears evidence and pauses learning. Games use the existing Personal memory field; edits/forgetting clear recent conversation so removed games are not retained in that history.
- Unlock Tiny nuzzle, Paw promise, Wing hug and Happy flourish at 10/25/50/100 friendship. Older points migrate quietly; each new tier announces once without cutting the current conversation. Gestures stay in place and stop for higher-priority activity, games or reduced motion.
- Keep native startup/input recovery and portable extraction checks.
- Publish accumulated 0.16–0.23 improvements with a refreshed README, current screenshots, setup/roadmap documentation, release notes and a checksummed Windows beta.

## 0.22.0 — Voice & Body Language local preview, unpublished

- Replace the looping mouth animation with a bounded WAV envelope sampled against actual Kokoro playback time, including silence, pause, seeking and buffering.
- Forward validated Windows mouth-position and word events; use word-timed browser/native fallback and keep unsupported voices still. Cancel old timing and audio timers with speech.
- Add small phrase gestures and eased personality posture/gaze, respecting motion intensity and existing action priorities. Games and reduced motion remain still.
- Add independently controlled, locally synthesized interaction chirps, care squeaks and sleep yawns, off by default. Quiet, games, focus, capture and speech mute them; volume is bounded separately.
- Keep controls collapsed under Voice → Dragon expressions & sounds. Saves stay on schema 15, startup safeguards remain, and there is no GitHub publication.

## 0.21.0 — Reaction Timing & Transitions local preview, unpublished

- Wait for stable foreground activity and a genuine typing pause before automatic observations; recheck freshness and activity revision before delivering model output.
- Coalesce automatic filename/content notices, discard obsolete or interrupted notices, and retain immediate explicit file selection and live file-card updates.
- Expire old task gestures instead of replaying them after cooldown; typing priority remains independent of the mimic-animation preference.
- Blend motion joints between activity modes and compensate interrupted 2D artwork poses, settling naturally without moving the companion or changing rewards.
- Games, hidden windows and reduced motion clear blends immediately. Retain 3D trick animations and all startup safeguards. Saves remain on schema 15. No GitHub publication.

## 0.20.0 — Motion & Animation local preview, unpublished

- Independent animation joints preserve existing trick, expression, voice and reaction poses. Actual travel drives coordinated paws, body bob, head and arm motion, with eased turns.
- Weighted drag, falling stretch, grounded landing squash/settle, and a height-sensitive ground shadow.
- Natural single/double blinking, silent idle details, and distinct wing/tail/breathing profiles for all four looks. Existing motion levels and silent-habit preference apply.
- Collapsed six-second motion previews stay in place and yield to higher-priority activity. No AI requests, speech, rewards, position changes, or new saved fields.
- Actual renderer recording script; retained startup safeguards, game anchors and reduced-motion behavior. No GitHub publication.

## 0.19.0 — Dragon Looks local preview, unpublished

- Three new selectable vector dragons: Cloud Drake, Night Wyvern, and River Dragon. Original remains available; all share the existing face and animated joints.
- Compact previews in the collapsed Style section; free switching with independent colors and wardrobe. No AI calls or changes to earned progress.
- Save schema 15 retains prior settings/progress and defaults older saves to Original. Backup import/export preserves the look.
- Reusable export script creates transparent neutral PNG/SVG artwork and a labeled preview from the real app geometry. No GitHub publication.

## 0.18.0 — Expressive Companion local preview, unpublished

- Activity-based affectionate, proud, sleepy, curious, playful, focused, and calm faces, with existing action/voice pose priority. Pride follows completed trick learning or focus, not inferred game victories.
- Collapsed Little moments controls and silent autonomous paw offers, settling, head scratches on request, and live home-basket toy collection/return. Busy-state interruptions, game priority, no rewards/AI calls, and static reduced-motion poses.
- Automatic comments pause during typing, focus, hidden state, ongoing interactions, and readable bubbles. Replies that become stale while typing are discarded in both renderer and desktop paths.
- Five-minute unanswered-question protection and ten-minute follow-up context across app switches. Answering clears the question wait; explicit new topics reset context. Ten-minute delivered-comment repeat suppression handles common paraphrases without consuming rejected replies.
- Schema 14 preserves prior saves, tricks, home, memory, voice, and permissions, with independent mood/interaction preferences. Temporary emotions/routes are not persisted.

## 0.17.0 — Little Adventures local preview, unpublished

- Quiet screen-edge travel/peeks/return routes and climbs along the current usable window edge. Routes use live perch/viewport geometry, cancel on lost/replaced surfaces, and pause for typing, conversation, home activities, focus, games, and reduced motion. Automatic exploring follows Wandering; explicit previews still work when Wandering is off. Return peeks wait briefly for wake-up stretches.
- A collapsed Trick school teaches wave, bow, spin, and hop through three completed practices. Learning and cooldowns survive saves/backups; interrupted practices award nothing, and practice never earns coins. Learned tricks can be performed with buttons or explicit typed/voice commands such as “practice wave” and “do a wave”, without Ollama. Reduced motion uses still poses.
- A clickable attention badge names the current observed window or file while controls are closed. Expanded details distinguish window titles, filename-only observations, sampled file reads, missing/stale signals, and listening/conversation/focus/rest priorities. It hides during games, remains click-through-aware, and is masked from optional screen captures. Turning it off hides the badge without changing sensing permissions.
- Changing a title inside one window also invalidates a selected file’s short automatic grace period, in both renderer and desktop model context. Explicit questions about the selected file still work. Attention and route coordinates stay transient and never enter saves or memories.
- Schema 13 preserves previous progress/preferences and adds learned tricks, screen adventures, and attention badge preferences. This preview remains local; GitHub is unchanged.

## 0.16.0 — Living Companion local preview, unpublished

- Silent daily routines follow local morning/afternoon/evening/night periods: hops, head tilts, peeking, snuggling, and yawns. They yield to typing, conversation, focus, sleep, games, home activities, and window perching. They never force sleep or add greetings.
- Personality affects wandering speed, timing, and routine preferences. Gentle/Normal/Lively movement is independent of conversation frequency and speech chatter. Reduced motion disables daily routines.
- Fresh page/document titles inside the same window invalidate pending observations and gestures. Built-in comments settle before naming a new title, and briefly acknowledge returning to a recent task. Live AI also discards replies for obsolete titles.
- Explicit typed/spoken “remind me in 10 minutes to drink water” requests use existing local timers without Ollama. Mentioning homework or studying offers a 25-minute focus buddy in Creature → A little help; starting remains your choice. Selected-file help uses the file you showed.
- General → Startup & backups adds opt-in Windows startup using the persistent portable executable, plus JSON save export/import with validation and a replacement preview. Restoring memories/settings retains this PC’s observation, microphone, speech, and automatic-conversation permissions. Connected-folder grants and startup registration are not exported.
- General → Local connections gives Ollama, voice, and startup status with a manual refresh. Schema 12 preserves existing saves. This preview has not been pushed to GitHub.

## 0.15.1 — public beta: voice, home, and desktop startup fix

- Publish the accumulated 0.11–0.15 improvements: Windows/Kokoro spoken replies, push-to-talk, local creature commands, organized settings, a movable home, decor, and task gestures. Earlier preview entries below describe development milestones first included in this public update.
- Resolve Windows speech/JSON assemblies from their loaded framework locations before compiling helper C#. Browser voice checks wait for playback completion rather than assuming it finishes within 700 ms.
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
