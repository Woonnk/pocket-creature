# Publishing GitHub releases

The repository is `Woonnk/pocket-creature`. The current beta is 0.15.1; stable 1.0 follows the readiness checks below.

## Publish a 0.x beta

Update package.json/package-lock.json, README.md, RELEASE_NOTES.md, CHANGELOG.md, and QA.md for the actual scope. Run checks before publication. Push reviewed source to main with `[release]` in the publication commit message, or push an explicit `v0.x.y` tag matching package.json. Ordinary main commits only run CI and do not publish.

The release workflow checks the version, runs logic/browser tests, compiles all bundled Windows helpers, builds/verifies the Windows portable package, and prepares checksummed assets. Only after those steps pass, it publishes a **pre-release** tagged at the tested commit. Downloads include the Windows EXE, standalone HTML, LICENSE, THIRD_PARTY_NOTICES.md, and SHA256SUMS.txt; GitHub supplies source archives. Verify Actions, the pre-release flag, source commit/tag, and assets before reporting publication complete. Inspect and repair an existing release rather than replacing it blindly or triggering the same version twice.

The 0.10 beta remains in release history. The user's 0.15.1 launch/Kokoro smoke report is recorded in QA.md; it does not close broader native acceptance checks.

## Before 1.0

Complete direct Windows checks in QA.md, including perching, mixed-DPI monitors, game visibility, memory edits/forgetting, Ollama replies, voice input/output, tray/shortcuts, and save migration. Finish launch-at-startup, save export/import, and clearer connection status. CI/package success is not native runtime evidence.

## Prepare a versioned build

1. Update package.json/package-lock.json together and refresh documentation around the final scope.
2. Run `npm ci`, `npm test`, and `npm run test:browser` after installing Chromium. On Windows run `powershell -NoProfile -File scripts/verify-windows-helper.ps1` to compile bundled helpers without sensing or microphone capture.
3. Run `npm run dist:win`, `npm run check:release`, and `npm run release:assets`. Verification covers PE headers, package version, matching runtime files, unpacked PowerShell, and runtime notices.
4. Push reviewed source to main. Generated EXEs, dependencies, local saves, and secrets are excluded by .gitignore.
5. For 1.x, push an explicit matching version tag. The workflow tests/builds and creates a **draft** with assets and notes; review and publish the draft separately. A main `[release]` commit is allowed only for 0.x betas.

Actions use read-only permissions except the separate publication job; checkout credentials are not retained. No personal token or machine credentials are embedded. Keep runtime licenses in the packaged application and review dependency upgrades with tests.
