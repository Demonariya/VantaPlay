# VantaPlay

VantaPlay is an independent Windows-first desktop media player built with React, TypeScript and Tauri 2. Its interface is based on the [VLC Redesign Figma Community file](https://www.figma.com/design/0XClVGovN9BlXM3zXK9Ra8/VLC-Redesign--Community-?node-id=187-328), with credit to the original concept author and implementation.

> **Current implementation status:** this repository began as a fork of [sudo-Mystic/vlc-redesign](https://github.com/sudo-Mystic/vlc-redesign) (MIT). The inherited playback path uses the WebView's HTML media stack. The requested native libVLC playback engine and native video-surface integration are not yet complete; this repository does not claim otherwise.

## Development

Requirements: Node.js 22, Rust stable, and the Tauri 2 Windows prerequisites.

```powershell
npm ci
npm test
npm run build
npm run tauri dev
```

Build a Windows installer and application binary:

```powershell
npm run tauri build
```

Every push to `main` runs the Windows build workflow. The workflow uploads a `VantaPlay-Windows-x64` artifact containing the renamed application executable plus any generated NSIS/MSI installers. Open the repository's **Actions** tab, select the latest successful **Build Windows EXE** run, and download its artifact.

## Design reference

- [VLC Redesign — primary Player frame](https://www.figma.com/design/0XClVGovN9BlXM3zXK9Ra8/VLC-Redesign--Community-?node-id=187-328)
- Main reference frame: `Player`, 1920 × 1080.
- The design contains player variants, a music player, global and category-specific settings, subtitle controls, network streams, playlists, a mini-player, context menus and keyboard shortcuts.

## Attribution and licensing

This repository retains the upstream MIT license and credits the upstream implementation and design concept. VantaPlay is an independent project and is not affiliated with or endorsed by VideoLAN. Before distributing libVLC binaries, review VideoLAN's current licensing and plugin redistribution requirements.
