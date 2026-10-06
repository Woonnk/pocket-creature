# Third-party notices

Project-authored JavaScript, PowerShell/C#, original vector dragon artwork, styles, and documentation are covered by LICENSE.

The packaged application uses Electron, Chromium, and Node.js. Preserve the packaged `LICENSE.electron.txt` and `LICENSES.chromium.html` supplied with the Electron distribution; they contain runtime and dependency notices. Don't strip these files from Windows packages.

Electron Builder and Playwright are development/test tools pinned in package-lock.json. Their own licenses remain with their installed packages. Browser test binaries are not shipped as part of the application.

Ollama and local models are optional, separately installed components. This project does not bundle their code or model weights; consult those components' own licenses.
