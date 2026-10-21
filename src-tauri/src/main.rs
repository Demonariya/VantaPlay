#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{ffi::{c_char, c_int, c_void, CString}, path::PathBuf, ptr, sync::Mutex};
use libloading::Library;
use serde::Serialize;
use tauri::{AppHandle, Manager, State, Window};
#[cfg(windows)]
use tauri::platform::windows::WindowExtWindows;

#[derive(Clone, Copy, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct VideoBounds { x: i32, y: i32, width: i32, height: i32 }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NativePlaybackStatus {
    state: String,
    current_time_ms: i64,
    duration_ms: i64,
    volume_percent: i32,
    muted: bool,
    rate: f32,
}
impl Default for NativePlaybackStatus {
    fn default() -> Self {
        Self { state: "stopped".into(), current_time_ms: 0, duration_ms: 0, volume_percent: 80, muted: false, rate: 1.0 }
    }
}

type NewInstance = unsafe extern "C" fn(c_int, *const *const c_char) -> *mut c_void;
type ReleaseInstance = unsafe extern "C" fn(*mut c_void);
type MediaNewPath = unsafe extern "C" fn(*mut c_void, *const c_char) -> *mut c_void;
type MediaNewLocation = unsafe extern "C" fn(*mut c_void, *const c_char) -> *mut c_void;
type MediaRelease = unsafe extern "C" fn(*mut c_void);
type PlayerNew = unsafe extern "C" fn(*mut c_void) -> *mut c_void;
type PlayerRelease = unsafe extern "C" fn(*mut c_void);
type PlayerSetMedia = unsafe extern "C" fn(*mut c_void, *mut c_void);
type PlayerPlay = unsafe extern "C" fn(*mut c_void) -> c_int;
type PlayerPause = unsafe extern "C" fn(*mut c_void);
type PlayerStop = unsafe extern "C" fn(*mut c_void);
type PlayerGetState = unsafe extern "C" fn(*mut c_void) -> c_int;
type PlayerGetTime = unsafe extern "C" fn(*mut c_void) -> i64;
type PlayerGetLength = unsafe extern "C" fn(*mut c_void) -> i64;
type PlayerSetTime = unsafe extern "C" fn(*mut c_void, i64) -> c_int;
type PlayerSetRate = unsafe extern "C" fn(*mut c_void, f32) -> c_int;
type PlayerGetRate = unsafe extern "C" fn(*mut c_void) -> f32;
type PlayerSetHwnd = unsafe extern "C" fn(*mut c_void, *mut c_void);
type AudioGetVolume = unsafe extern "C" fn(*mut c_void) -> c_int;
type AudioSetVolume = unsafe extern "C" fn(*mut c_void, c_int) -> c_int;
type AudioGetMute = unsafe extern "C" fn(*mut c_void) -> c_int;
type AudioSetMute = unsafe extern "C" fn(*mut c_void, c_int);

struct VlcApi {
    _library: Library,
    new_instance: NewInstance,
    release_instance: ReleaseInstance,
    media_new_path: MediaNewPath,
    media_new_location: MediaNewLocation,
    media_release: MediaRelease,
    player_new: PlayerNew,
    player_release: PlayerRelease,
    player_set_media: PlayerSetMedia,
    player_play: PlayerPlay,
    player_pause: PlayerPause,
    player_stop: PlayerStop,
    player_get_state: PlayerGetState,
    player_get_time: PlayerGetTime,
    player_get_length: PlayerGetLength,
    player_set_time: PlayerSetTime,
    player_set_rate: PlayerSetRate,
    player_get_rate: PlayerGetRate,
    player_set_hwnd: PlayerSetHwnd,
    audio_get_volume: AudioGetVolume,
    audio_set_volume: AudioSetVolume,
    audio_get_mute: AudioGetMute,
    audio_set_mute: AudioSetMute,
}

impl VlcApi {
    fn load(app: &AppHandle) -> Result<Self, String> {
        let mut candidates: Vec<PathBuf> = Vec::new();
        if let Ok(exe) = std::env::current_exe() {
            if let Some(dir) = exe.parent() {
                candidates.push(dir.join("vlc"));
                candidates.push(dir.join("resources").join("vlc"));
                candidates.push(dir.to_path_buf());
            }
        }
        if let Ok(resource_dir) = app.path().resource_dir() {
            candidates.push(resource_dir.join("vlc"));
            candidates.push(resource_dir.join("resources").join("vlc"));
            candidates.push(resource_dir.clone());
            if let Some(parent) = resource_dir.parent() {
                candidates.push(parent.join("resources").join("vlc"));
                candidates.push(parent.join("vlc"));
            }
        }
        let vlc_dir = candidates.into_iter().find(|path| path.join("libvlc.dll").is_file());
        if let Some(dir) = vlc_dir.as_ref() {
            if dir.join("plugins").is_dir() {
                std::env::set_var("VLC_PLUGIN_PATH", dir.join("plugins"));
            }
            #[cfg(windows)]
            {
                use std::os::windows::ffi::OsStrExt;
                use windows_sys::Win32::System::LibraryLoader::SetDllDirectoryW;
                let wide: Vec<u16> = dir.as_os_str().encode_wide().chain(Some(0)).collect();
                unsafe { SetDllDirectoryW(wide.as_ptr()); }
            }
        }
        let library_path = vlc_dir.as_ref().map(|dir| dir.join("libvlc.dll")).unwrap_or_else(|| PathBuf::from("libvlc.dll"));
        let library = unsafe { Library::new(&library_path) }.map_err(|error| {
            format!("Could not load libVLC at {}. Use the VantaPlay Windows package with its VLC runtime folder. Details: {error}", library_path.display())
        })?;
        macro_rules! symbol {
            ($name:literal, $type:ty) => {
                unsafe { *library.get::<$type>(concat!($name, "\0").as_bytes())
                    .map_err(|error| format!("Missing libVLC symbol {}: {error}", $name))? }
            };
        }
        Ok(Self {
            new_instance: symbol!("libvlc_new", NewInstance),
            release_instance: symbol!("libvlc_release", ReleaseInstance),
            media_new_path: symbol!("libvlc_media_new_path", MediaNewPath),
            media_new_location: symbol!("libvlc_media_new_location", MediaNewLocation),
            media_release: symbol!("libvlc_media_release", MediaRelease),
            player_new: symbol!("libvlc_media_player_new", PlayerNew),
            player_release: symbol!("libvlc_media_player_release", PlayerRelease),
            player_set_media: symbol!("libvlc_media_player_set_media", PlayerSetMedia),
            player_play: symbol!("libvlc_media_player_play", PlayerPlay),
            player_pause: symbol!("libvlc_media_player_pause", PlayerPause),
            player_stop: symbol!("libvlc_media_player_stop", PlayerStop),
            player_get_state: symbol!("libvlc_media_player_get_state", PlayerGetState),
            player_get_time: symbol!("libvlc_media_player_get_time", PlayerGetTime),
            player_get_length: symbol!("libvlc_media_player_get_length", PlayerGetLength),
            player_set_time: symbol!("libvlc_media_player_set_time", PlayerSetTime),
            player_set_rate: symbol!("libvlc_media_player_set_rate", PlayerSetRate),
            player_get_rate: symbol!("libvlc_media_player_get_rate", PlayerGetRate),
            player_set_hwnd: symbol!("libvlc_media_player_set_hwnd", PlayerSetHwnd),
            audio_get_volume: symbol!("libvlc_audio_get_volume", AudioGetVolume),
            audio_set_volume: symbol!("libvlc_audio_set_volume", AudioSetVolume),
            audio_get_mute: symbol!("libvlc_audio_get_mute", AudioGetMute),
            audio_set_mute: symbol!("libvlc_audio_set_mute", AudioSetMute),
            _library: library,
        })
    }
}

struct VlcEngine {
    api: Option<VlcApi>,
    instance: *mut c_void,
    media: *mut c_void,
    player: *mut c_void,
    parent_hwnd: isize,
    video_hwnd: isize,
    bounds: VideoBounds,
}
unsafe impl Send for VlcEngine {}
impl Default for VlcEngine {
    fn default() -> Self {
        Self { api: None, instance: ptr::null_mut(), media: ptr::null_mut(), player: ptr::null_mut(), parent_hwnd: 0, video_hwnd: 0, bounds: VideoBounds::default() }
    }
}
impl VlcEngine {
    fn ensure_instance(&mut self, app: &AppHandle) -> Result<(), String> {
        if self.api.is_none() { self.api = Some(VlcApi::load(app)?); }
        if self.instance.is_null() {
            let args = [CString::new("--no-video-title-show").unwrap(), CString::new("--no-osd").unwrap(), CString::new("--quiet").unwrap()];
            let argv: Vec<*const c_char> = args.iter().map(|value| value.as_ptr()).collect();
            self.instance = unsafe { (self.api.as_ref().expect("VLC API loaded").new_instance)(argv.len() as c_int, argv.as_ptr()) };
            if self.instance.is_null() { return Err("libVLC could not initialize. Check that its plugins directory is bundled.".into()); }
        }
        Ok(())
    }
    fn ensure_surface(&mut self, parent_hwnd: isize) -> Result<(), String> {
        if self.video_hwnd == 0 {
            self.video_hwnd = create_native_video_child(parent_hwnd)?;
            self.parent_hwnd = parent_hwnd;
            apply_video_bounds(self.video_hwnd, self.bounds);
        } else if self.parent_hwnd != parent_hwnd {
            return Err("The native video surface belongs to a different window.".into());
        }
        Ok(())
    }
    fn stop_current(&mut self) {
        if let Some(api) = self.api.as_ref() {
            unsafe {
                if !self.player.is_null() { (api.player_stop)(self.player); (api.player_release)(self.player); }
                if !self.media.is_null() { (api.media_release)(self.media); }
            }
        }
        self.player = ptr::null_mut();
        self.media = ptr::null_mut();
    }
    fn status(&self) -> NativePlaybackStatus {
        let Some(api) = self.api.as_ref() else { return NativePlaybackStatus::default(); };
        if self.player.is_null() { return NativePlaybackStatus::default(); }
        unsafe {
            let state = (api.player_get_state)(self.player);
            let volume = (api.audio_get_volume)(self.player);
            let mute = (api.audio_get_mute)(self.player);
            let rate = (api.player_get_rate)(self.player);
            NativePlaybackStatus {
                state: match state { 1 => "opening", 2 => "buffering", 3 => "playing", 4 => "paused", 5 => "stopped", 6 => "ended", 7 => "error", _ => "idle" }.into(),
                current_time_ms: (api.player_get_time)(self.player).max(0),
                duration_ms: (api.player_get_length)(self.player).max(0),
                volume_percent: if volume < 0 { 80 } else { volume },
                muted: mute > 0,
                rate: if rate.is_finite() && rate > 0.0 { rate } else { 1.0 },
            }
        }
    }
    fn set_bounds(&mut self, bounds: VideoBounds) {
        self.bounds = bounds;
        if self.video_hwnd != 0 { apply_video_bounds(self.video_hwnd, bounds); }
    }
}
impl Drop for VlcEngine {
    fn drop(&mut self) {
        self.stop_current();
        if let Some(api) = self.api.as_ref() {
            if !self.instance.is_null() { unsafe { (api.release_instance)(self.instance) }; }
        }
        self.instance = ptr::null_mut();
        if self.video_hwnd != 0 { destroy_native_video_child(self.video_hwnd); }
        self.video_hwnd = 0;
    }
}
#[derive(Default)]
struct VlcState { engine: Mutex<VlcEngine> }

#[tauri::command]
fn pick_media_files() -> Vec<String> {
    rfd::FileDialog::new()
        .add_filter("Audio and video", &[
            "mp4", "mkv", "avi", "mov", "m4v", "webm", "mpeg", "mpg", "wmv", "flv",
            "m2ts", "ts", "mp3", "flac", "wav", "ogg", "opus", "m4a", "aac", "wma",
            "aiff", "alac", "3gp", "vob"
        ])
        .pick_files().unwrap_or_default().into_iter().map(|path| path.to_string_lossy().into_owned()).collect()
}

#[tauri::command]
fn vlc_open(source: String, start_time_ms: Option<i64>, app: AppHandle, window: Window, state: State<'_, VlcState>) -> Result<(), String> {
    #[cfg(not(windows))]
    { let _ = (source, start_time_ms, app, window, state); return Err("Native libVLC video rendering is currently supported on Windows.".into()); }
    #[cfg(windows)]
    {
        let hwnd = window.hwnd().map_err(|error| error.to_string())?.0 as isize;
        let mut engine = state.engine.lock().map_err(|_| "Native playback state is unavailable.".to_string())?;
        engine.ensure_instance(&app)?;
        engine.ensure_surface(hwnd)?;
        engine.stop_current();
        let source = source.trim();
        if source.is_empty() { return Err("No media source was provided.".into()); }
        let csource = CString::new(source).map_err(|_| "The media path contains an invalid null character.".to_string())?;
        let instance = engine.instance;
        let video_hwnd = engine.video_hwnd as *mut c_void;
        let api = engine.api.as_ref().expect("VLC API loaded");
        let is_url = ["http://", "https://", "rtsp://", "rtmp://", "udp://", "ftp://"].iter().any(|prefix| source.starts_with(prefix));
        let media = unsafe {
            if is_url { (api.media_new_location)(instance, csource.as_ptr()) }
            else { (api.media_new_path)(instance, csource.as_ptr()) }
        };
        if media.is_null() { return Err("libVLC could not open this media source.".into()); }
        let player = unsafe { (api.player_new)(instance) };
        if player.is_null() { unsafe { (api.media_release)(media) }; return Err("libVLC could not create a media player.".into()); }
        unsafe { (api.player_set_media)(player, media); (api.player_set_hwnd)(player, video_hwnd); }
        engine.media = media;
        engine.player = player;
        if unsafe { (api.player_play)(player) } < 0 {
            engine.stop_current();
            return Err("libVLC rejected the media source.".into());
        }
        if let Some(time_ms) = start_time_ms.filter(|value| *value > 0) {
            unsafe { (api.player_set_time)(player, time_ms); }
        }
        Ok(())
    }
}
#[tauri::command]
fn vlc_play(state: State<'_, VlcState>) -> Result<(), String> {
    let engine = state.engine.lock().map_err(|_| "Native playback state is unavailable.".to_string())?;
    let api = engine.api.as_ref().ok_or_else(|| "libVLC is not initialized.".to_string())?;
    if engine.player.is_null() { return Err("No native media is loaded.".into()); }
    if unsafe { (api.player_play)(engine.player) } < 0 { Err("libVLC could not start playback.".into()) } else { Ok(()) }
}
#[tauri::command]
fn vlc_pause(state: State<'_, VlcState>) -> Result<(), String> {
    let engine = state.engine.lock().map_err(|_| "Native playback state is unavailable.".to_string())?;
    let api = engine.api.as_ref().ok_or_else(|| "libVLC is not initialized.".to_string())?;
    if engine.player.is_null() { return Err("No native media is loaded.".into()); }
    unsafe { (api.player_pause)(engine.player); }
    Ok(())
}
#[tauri::command]
fn vlc_stop(state: State<'_, VlcState>) -> Result<(), String> {
    let mut engine = state.engine.lock().map_err(|_| "Native playback state is unavailable.".to_string())?;
    engine.stop_current(); engine.set_bounds(VideoBounds::default()); Ok(())
}
#[tauri::command]
fn vlc_seek(time_ms: i64, state: State<'_, VlcState>) -> Result<(), String> {
    let engine = state.engine.lock().map_err(|_| "Native playback state is unavailable.".to_string())?;
    let api = engine.api.as_ref().ok_or_else(|| "libVLC is not initialized.".to_string())?;
    if engine.player.is_null() { return Err("No native media is loaded.".into()); }
    if unsafe { (api.player_set_time)(engine.player, time_ms.max(0)) } < 0 { Err("libVLC could not seek to that position.".into()) } else { Ok(()) }
}
#[tauri::command]
fn vlc_set_volume(volume_percent: i32, state: State<'_, VlcState>) -> Result<(), String> {
    let engine = state.engine.lock().map_err(|_| "Native playback state is unavailable.".to_string())?;
    let api = engine.api.as_ref().ok_or_else(|| "libVLC is not initialized.".to_string())?;
    if engine.player.is_null() { return Ok(()); }
    if unsafe { (api.audio_set_volume)(engine.player, volume_percent.clamp(0, 200)) } < 0 { Err("libVLC could not change the volume.".into()) } else { Ok(()) }
}
#[tauri::command]
fn vlc_set_mute(muted: bool, state: State<'_, VlcState>) -> Result<(), String> {
    let engine = state.engine.lock().map_err(|_| "Native playback state is unavailable.".to_string())?;
    let api = engine.api.as_ref().ok_or_else(|| "libVLC is not initialized.".to_string())?;
    if !engine.player.is_null() { unsafe { (api.audio_set_mute)(engine.player, if muted { 1 } else { 0 }); } }
    Ok(())
}
#[tauri::command]
fn vlc_set_rate(rate: f32, state: State<'_, VlcState>) -> Result<(), String> {
    let engine = state.engine.lock().map_err(|_| "Native playback state is unavailable.".to_string())?;
    let api = engine.api.as_ref().ok_or_else(|| "libVLC is not initialized.".to_string())?;
    if engine.player.is_null() { return Ok(()); }
    if unsafe { (api.player_set_rate)(engine.player, rate.clamp(0.25, 4.0)) } < 0 { Err("libVLC could not change playback speed.".into()) } else { Ok(()) }
}
#[tauri::command]
fn vlc_status(state: State<'_, VlcState>) -> Result<NativePlaybackStatus, String> {
    let engine = state.engine.lock().map_err(|_| "Native playback state is unavailable.".to_string())?;
    Ok(engine.status())
}
#[tauri::command]
fn vlc_set_video_bounds(bounds: VideoBounds, state: State<'_, VlcState>) -> Result<(), String> {
    let mut engine = state.engine.lock().map_err(|_| "Native playback state is unavailable.".to_string())?;
    engine.set_bounds(bounds); Ok(())
}

#[cfg(windows)]
fn create_native_video_child(parent_hwnd: isize) -> Result<isize, String> {
    use std::{os::windows::ffi::OsStrExt, ptr::null_mut};
    use windows_sys::Win32::{System::LibraryLoader::GetModuleHandleW, UI::WindowsAndMessaging::{CreateWindowExW, WS_CHILD, WS_CLIPCHILDREN, WS_CLIPSIBLINGS}};
    let class: Vec<u16> = std::ffi::OsStr::new("STATIC").encode_wide().chain(Some(0)).collect();
    let title: Vec<u16> = std::ffi::OsStr::new("VantaPlayVideo").encode_wide().chain(Some(0)).collect();
    let hwnd = unsafe {
        CreateWindowExW(0, class.as_ptr(), title.as_ptr(), WS_CHILD | WS_CLIPCHILDREN | WS_CLIPSIBLINGS,
            0, 0, 1, 1, parent_hwnd as windows_sys::Win32::Foundation::HWND, null_mut(), GetModuleHandleW(ptr::null()), null_mut())
    };
    if hwnd.is_null() { Err("Windows could not create the native video surface.".into()) } else { Ok(hwnd as isize) }
}
#[cfg(not(windows))]
fn create_native_video_child(_parent_hwnd: isize) -> Result<isize, String> {
    Err("Native video surfaces are only supported on Windows.".into())
}
#[cfg(windows)]
fn apply_video_bounds(hwnd: isize, bounds: VideoBounds) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{MoveWindow, ShowWindow, SW_HIDE, SW_SHOW};
    let handle = hwnd as windows_sys::Win32::Foundation::HWND;
    unsafe {
        if bounds.width <= 0 || bounds.height <= 0 { ShowWindow(handle, SW_HIDE); }
        else { MoveWindow(handle, bounds.x, bounds.y, bounds.width, bounds.height, 1); ShowWindow(handle, SW_SHOW); }
    }
}
#[cfg(not(windows))]
fn apply_video_bounds(_hwnd: isize, _bounds: VideoBounds) {}
#[cfg(windows)]
fn destroy_native_video_child(hwnd: isize) {
    use windows_sys::Win32::UI::WindowsAndMessaging::DestroyWindow;
    unsafe { DestroyWindow(hwnd as windows_sys::Win32::Foundation::HWND); }
}
#[cfg(not(windows))]
fn destroy_native_video_child(_hwnd: isize) {}

fn main() {
    tauri::Builder::default()
        .manage(VlcState::default())
        .invoke_handler(tauri::generate_handler![
            pick_media_files, vlc_open, vlc_play, vlc_pause, vlc_stop, vlc_seek,
            vlc_set_volume, vlc_set_mute, vlc_set_rate, vlc_status, vlc_set_video_bounds
        ])
        .run(tauri::generate_context!())
        .expect("error while running VantaPlay");
}
