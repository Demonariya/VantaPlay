// VLC Redesigned — Tauri shell. The UI is the Vite/React app in ../dist;
// playback uses the HTML5 media stack. This binary is intentionally thin:
// window, bundling and (later) native file dialogs live here.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
