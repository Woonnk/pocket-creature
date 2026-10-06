# Contributing

Use Node.js 24 and npm. The native companion targets Windows 10/11 x64; its browser playground and logic tests run on Windows or Linux.

```sh
npm ci
npm test
npm run demo
```

For the full browser suite:

```sh
npx playwright install chromium
npm run test:browser
```

On Linux, Playwright's system dependencies may also be needed: `npx playwright install --with-deps chromium`. Stop a running demo before the suite; both use localhost port 4173. Tests can use a supplied `CHROMIUM_EXECUTABLE`. Browser captures and the standalone playground are written to `dist/`; reviewed project screenshots live in `docs/screenshots/`.

For the desktop app on Windows:

```sh
npm start
```

For packaging:

```sh
npm run dist:win
npm run check:release
npm run release:assets
```

Keep pure behavior in renderer modules and native capabilities in the narrow desktop bridge. Preserve old save data, quiet-mode behavior, game corner priority, context cancellation, short bubbles, and accessibility/reduced-motion choices. Personal facts come from clear user statements or edits, never screen inference. Geometry and screenshots stay out of persistent state.

Test meaningful behavior changes with fixtures or bridge mocks. A passing mock is not evidence of native Windows behavior: record direct PC observations in QA.md. Please include the problem, change, verification, and remaining limits in pull requests. Don't commit generated packages, personal saves, file samples, secrets, or machine-specific paths. Follow the existing original vector artwork and animation style.
