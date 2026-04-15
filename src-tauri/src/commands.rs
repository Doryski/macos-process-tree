use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;
use sysinfo::System;
use tauri::{ipc::Channel, State};

use crate::process_tree;
use crate::types::{KillResult, ProcessInfo};

pub struct AppState {
    pub system: Mutex<System>,
    pub snapshot: Mutex<HashMap<u32, process_tree::ProcessSnapshot>>,
}

#[tauri::command]
pub fn get_process_tree(state: State<AppState>) -> Vec<ProcessInfo> {
    let mut system = state.system.lock().unwrap();
    process_tree::refresh_system(&mut system);
    process_tree::build_process_tree(&system)
}

/// Stream the full process tree via a Tauri Channel with adaptive polling.
/// Always sends the complete ordered tree (preserving DFS pre-order).
/// Uses delta computation internally only to detect idle periods and
/// slow down polling when nothing changes.
#[tauri::command]
pub async fn stream_processes(
    state: State<'_, AppState>,
    on_update: Channel<Vec<ProcessInfo>>,
    base_interval_ms: u64,
    max_interval_ms: u64,
) -> Result<(), String> {
    let base = Duration::from_millis(base_interval_ms.max(500));
    let max = Duration::from_millis(max_interval_ms.max(base_interval_ms));
    let mut current_interval = base;
    let mut empty_streak = 0u32;

    loop {
        let (tree, is_empty) = {
            let mut system = state.system.lock().unwrap();
            process_tree::refresh_system(&mut system);
            let tree = process_tree::build_process_tree(&system);
            let mut snapshot = state.snapshot.lock().unwrap();
            let delta = process_tree::compute_delta(&tree, &mut snapshot);
            let is_empty = delta.added.is_empty()
                && delta.updated.is_empty()
                && delta.removed.is_empty();
            (tree, is_empty)
        };

        // Adaptive polling: slow down when system is idle
        if is_empty {
            empty_streak += 1;
            if empty_streak >= 3 {
                current_interval = (current_interval * 2).min(max);
            }
        } else {
            empty_streak = 0;
            current_interval = base;
        }

        if on_update.send(tree).is_err() {
            break;
        }

        tokio::time::sleep(current_interval).await;
    }

    Ok(())
}

#[tauri::command]
pub fn kill_process(pid: u32, signal: i32) -> Result<(), String> {
    let result = unsafe { libc::kill(pid as i32, signal) };
    if result == 0 {
        Ok(())
    } else {
        Err(format!(
            "Failed to kill PID {}: {}",
            pid,
            std::io::Error::last_os_error()
        ))
    }
}

#[tauri::command]
pub fn kill_processes(pids: Vec<u32>, signal: i32) -> Vec<KillResult> {
    pids.iter()
        .map(|&pid| {
            let result = unsafe { libc::kill(pid as i32, signal) };
            KillResult {
                pid,
                success: result == 0,
                error: if result == 0 {
                    None
                } else {
                    Some(std::io::Error::last_os_error().to_string())
                },
            }
        })
        .collect()
}
