# Security and privacy

Pocket Creature uses a sandboxed renderer with a restricted IPC bridge. It cannot follow instructions embedded in a file to execute commands. Selected text files are sampled within explicit file/folder access; screenshots require the separate Screen awareness switch and a vision model. The bundled helper counts keyboard events without reading key codes or characters.

Ollama requests use the fixed localhost endpoint `http://127.0.0.1:11434`; redirects and cloud-named models are rejected. The Ollama service/model is installed separately. Optional push-to-talk uses Windows offline recognition and bounded in-memory microphone capture only while held; sent transcripts become ordinary conversation history. Quiet, hide, lock/sleep, crash, or shutdown closes the input helper. Optional Kokoro synthesis uses only `http://127.0.0.1:8880`, rejects redirects, and bounds returned audio. Its service/model is installed separately. There is no analytics in this app.

Settings, notes, reminders, conversation, project memories, and editable personal details are saved locally. Conversation may quote observations, so clearing memory and chat matters when removing personal details. Window identities/geometry, raw titles, screenshots, and sampled file contents are transient; sample text may still be quoted in a manual reply.

If you find a vulnerability, use the repository's private vulnerability reporting option when available, or contact its maintainer privately through their public profile. Don't attach private screenshots, saves, or document contents to a public issue. Include a minimal synthetic reproduction, affected version, and relevant logs with personal content removed.

The project is currently a pre-1.0 prototype. Native Windows checks listed in QA.md remain pending. Exclusive fullscreen visibility and the factual accuracy of local model observations are not guaranteed.
