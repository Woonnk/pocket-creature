# Pocket Creature roadmap

Current public beta: **0.23.0**. Stable 1.0 follows the native acceptance checks in [QA.md](QA.md).

## Included in 0.23

| Area | Implemented |
| --- | --- |
| Desktop companion | Care, fetch, customization, themes, personalities, window perching, game corners and startup/input recovery |
| Optional local conversation | Ollama discovery/reconnection, short current-context observations, protected conversations and editable/forgettable memory |
| Voice | Windows/Kokoro speech, opt-in push-to-talk, local creature commands, voice timing, phrase gestures and optional dragon sounds |
| Home and expression | Movable bed/toys/decor, quiet routines, expressions, little moments, tricks, screen adventures and attention badge |
| Appearance and motion | Four looks, independent joints, natural motion and eased pose transitions |
| Bond and favorites | Learned snacks/activities, editable games, learning controls and four earned friendship gestures |
| Everyday helpers | Focus, local reminders, notes, startup controls, save backups and connection status |

Version-by-version changes are in [CHANGELOG.md](CHANGELOG.md).

## Before stable 1.0

- Complete native Windows launch, microphone/audio, Ollama/Kokoro and existing-save checks.
- Verify window perching, mixed-DPI monitors, monitor switching, game visibility, click-through, shortcuts, lock/sleep and recovery.
- Check startup paths and backup/restore on a disposable Windows profile.
- Fix beta reports and keep setup, connection status and controls understandable.

CI builds and helper compilation support these checks; they do not replace direct native acceptance.

## Next companion improvements

- Personal routines and mood continuity, with clear controls and no punishment for being away.
- Focus/break cycles and optional task lists.
- Reminder snooze, recurrence and history.
- More home toys and quiet interactions.
- Documented data-only character packs after the shared animation system is stable.

## Later exploration

- Reliable wandering across multiple monitors and more verified perching surfaces.
- Optional PC status reactions and explicitly configured music integrations.
- Multiple companions and simple shared interactions.
- User-selected app/folder shortcuts, kept separate from AI suggestions and conversation.

These are ideas, not promised release dates.

## Principles

Core care, play and timers work offline. AI and voice remain optional. One primary activity takes priority at a time; conversation, dragging, rest, focus, games and reduced motion constrain autonomous behavior. Personal memory comes from the user, and learning stays inspectable and forgettable. Always retain tray access, hiding, Quiet, reduced motion and manual controls. There is no friendship loss or illness for being away.
