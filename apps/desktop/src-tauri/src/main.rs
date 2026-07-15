#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, PhysicalPosition, WebviewWindow, WindowEvent,
};

fn clamp_window_position(window: &WebviewWindow, desired: PhysicalPosition<i32>) -> Result<(), String> {
    let monitors = window.available_monitors().map_err(|error| error.to_string())?;
    let window_size = window.outer_size().map_err(|error| error.to_string())?;
    let monitor = monitors
        .iter()
        .find(|monitor| {
            let position = monitor.position();
            let size = monitor.size();
            desired.x >= position.x
                && desired.y >= position.y
                && desired.x < position.x + size.width as i32
                && desired.y < position.y + size.height as i32
        })
        .or_else(|| monitors.first())
        .ok_or_else(|| "No monitor is available".to_string())?;

    let origin = monitor.position();
    let size = monitor.size();
    let max_x = origin.x + size.width as i32 - window_size.width as i32;
    let max_y = origin.y + size.height as i32 - window_size.height as i32;
    let clamped = PhysicalPosition::new(
        desired.x.clamp(origin.x, max_x.max(origin.x)),
        desired.y.clamp(origin.y, max_y.max(origin.y)),
    );
    window.set_position(clamped).map_err(|error| error.to_string())
}

fn place_bottom_right(window: &WebviewWindow) -> Result<(), String> {
    let monitor = window
        .current_monitor()
        .map_err(|error| error.to_string())?
        .or_else(|| window.primary_monitor().ok().flatten())
        .ok_or_else(|| "No monitor is available".to_string())?;
    let window_size = window.outer_size().map_err(|error| error.to_string())?;
    let origin = monitor.position();
    let size = monitor.size();
    clamp_window_position(
        window,
        PhysicalPosition::new(
            origin.x + size.width as i32 - window_size.width as i32 - 24,
            origin.y + size.height as i32 - window_size.height as i32 - 48,
        ),
    )
}

fn show_avatar_library(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("avatar-library") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn restore_window_position(window: WebviewWindow, x: i32, y: i32) -> Result<(), String> {
    clamp_window_position(&window, PhysicalPosition::new(x, y))
}

#[tauri::command]
fn open_avatar_library(app: tauri::AppHandle) {
    show_avatar_library(&app);
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let toggle = MenuItem::with_id(app, "toggle", "显示/隐藏", true, None::<&str>)?;
            let avatar_library = MenuItem::with_id(app, "avatar-library", "形象库", true, None::<&str>)?;
            let quiet = MenuItem::with_id(app, "quiet", "切换安静模式", true, None::<&str>)?;
            let reset = MenuItem::with_id(app, "reset", "重置位置", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle, &avatar_library, &quiet, &reset, &quit])?;

            let mut tray = TrayIconBuilder::new().menu(&menu).on_menu_event(|app, event| {
                match event.id().as_ref() {
                    "toggle" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    "avatar-library" => show_avatar_library(app),
                    "quiet" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("tray-quiet-toggle", ());
                        }
                    }
                    "reset" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = place_bottom_right(&window);
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                }
            });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.on_tray_icon_event(|tray, event| {
                if matches!(event, TrayIconEvent::DoubleClick { .. }) {
                    if let Some(window) = tray.app_handle().get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            })
            .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                let _ = place_bottom_right(&window);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![restore_window_position, open_avatar_library])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running desktop application");
}
