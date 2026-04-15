mod commands;
mod process_tree;
mod types;

use std::collections::HashMap;
use std::sync::Mutex;
use sysinfo::System;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initial refresh so the first query has CPU baseline data
    let mut system = System::new();
    process_tree::refresh_system(&mut system);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            system: Mutex::new(system),
            snapshot: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_process_tree,
            commands::stream_processes,
            commands::kill_process,
            commands::kill_processes,
        ])
        .setup(|app| {
            // Set dock/app icon at runtime (needed for dev mode)
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/128x128@2x.png"))
                    .expect("failed to load icon");
                app.get_webview_window("main")
                    .expect("main window not found")
                    .set_icon(icon)
                    .expect("failed to set icon");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
