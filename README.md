# VantaPlay

VantaPlay is a Windows-first desktop media player built with Rust, Tauri 2, React and TypeScript. Its interface is based on the [VLC Redesign Figma Community file](https://www.figma.com/design/0XClVGovN9BlXM3zXK9Ra8/VLC-Redesign--Community-?node-id=187-328).

## Native Windows playback

The native desktop file picker imports media by its real Windows filesystem path. The Windows Tauri backend calls libVLC for decoding and renders video to a Win32 child window while React playback controls remain in the WebView. Play/pause, seek, volume, mute, speed, status, progress resume and queue navigation are connected to native playback commands. Network stream URLs are also routed through libVLC.

Known remaining gap: items imported by the inherited browser drag-and-drop flow remain on the WebView/HTML media path. Native subtitle/audio track selection, subtitle timing, equalizer and other advanced VLC controls still need additional integration and are not claimed as complete.

## Build

Requirements for local development: Node.js 22, Rust stable, Visual Studio C++ build tools, and the Tauri/WebView2 Windows prerequisites.

    npm ci
    npm test
    npm run build
    npm run tauri dev
    npm run tauri build

GitHub Actions workflow “Build Windows EXE” installs the VLC runtime, runs the test suite and frontend build, builds the Tauri app and NSIS/MSI installers, and uploads a VantaPlay-Windows-x64 artifact containing VantaPlay.exe, a vlc runtime folder for portable use and installers. Download it from the latest successful run under the repository Actions tab.

## Figma reference

The primary screen is the Player frame, node 187:328, at 1920×1080. Other inspected frames cover music playback, UI visibility and customization, light theme, settings, subtitles, keyboard shortcuts, network streams, playlist dialogs, context menus and Mini Player.

## Credits and licensing

This repository is based on the MIT-licensed upstream implementation https://github.com/sudo-Mystic/vlc-redesign and credits the original redesign concept. VantaPlay is independent and not affiliated with VideoLAN. VLC runtime binaries and plugins have separate redistribution obligations; packaged builds include available license files and a runtime notice, but redistribution should be checked against the exact VLC version and plugin set.
