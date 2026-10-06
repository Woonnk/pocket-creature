# Publishing GitHub releases

The first public release is the 0.10.0 beta. Stable 1.0 follows the readiness checks below. The intended repository is `Woonnk/pocket-creature`.

## Publish the 0.10 beta

Push the reviewed source to main and let CI run. Create a release tagged `v0.10.0` at that source commit, titled `Pocket Creature 0.10.0 — public beta`, using RELEASE_NOTES.md. Mark it as a **pre-release**. Attach the tested Windows EXE, standalone HTML, LICENSE, THIRD_PARTY_NOTICES.md, and SHA256SUMS.txt. Source archives are supplied by GitHub. The Windows binary was tested for packaging integrity on Linux; direct Windows and live Ollama checks are still pending.

The existing automatic draft-release workflow deliberately starts at 1.x; publishing the beta tag does not create a competing automatic release. Main-branch CI still runs. Verify the public repository, source files/screenshots, release pre-release flag, and downloadable assets before reporting publication complete.

## Before 1.0

Complete the direct Windows checks in QA.md, including perching on moved/resized/restored/closed windows and mixed-DPI monitors, game visibility, personal memory edits/forgetting, Ollama replies, tray/shortcuts, and existing-save migration. Finish the planned launch-at-startup, save export/import, and clearer connection status work. Record evidence honestly; CI/package success is not native runtime evidence.

## Prepare a versioned build

1. Update package.json/package-lock.json together to 1.0.0. Update README.md, RELEASE_NOTES.md, CHANGELOG.md, and QA.md around the final scope.
2. Run `npm ci`, `npm test`, and `npm run test:browser` after installing Chromium. On Windows run `powershell -NoProfile -File scripts/verify-windows-helper.ps1` to validate the bundled helper without starting sensing.
3. Run `npm run dist:win`, `npm run check:release`, and `npm run release:assets`. The verifier checks PE headers, version, matching source/archive runtime files, unpacked PowerShell, and bundled runtime notices. Assets include the Windows EXE, standalone HTML, project/license notices, and SHA256SUMS.txt. GitHub supplies source archives from the release tag.
4. Push the reviewed source to main in the public repository and let CI complete. Generated EXEs, node_modules, local saves, and secrets are excluded by .gitignore. Keep reviewed screenshots under docs/screenshots.
5. Create and push the explicit `v1.0.0` tag. The prepared release workflow only responds to v1.* tags and checks that the tag exactly matches package.json. It tests/builds on Windows and creates a draft release with assets and notes. Review the draft, then publish it.

The manually published 0.10 beta does not satisfy the v1.* workflow tag/version check. Normal main-branch CI creates downloadable build artifacts without creating a release. Actions use read-only permissions except the separate draft-release job; checkout credentials are not retained. No personal token or machine credentials are embedded.

Use the same version/tag/notes process for later 1.x releases. Update workflow tag policy before supporting another major version. Keep runtime licenses in the packaged application and review dependency upgrades with the tests.
