use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use sysinfo::System;
use tauri::{ipc::Channel, AppHandle, Manager, State};

use crate::process_tree;
use crate::types::{KillResult, ProcessInfo};

pub struct Sampler {
    pub system: System,
    pub last_refresh: Option<Instant>,
}

pub struct AppState {
    pub sampler: Mutex<Sampler>,
    pub latest_stream: AtomicU64,
}

const MIN_REFRESH_GAP: Duration = Duration::from_millis(500);

fn snapshot_tree(app: &AppHandle) -> Vec<ProcessInfo> {
    let state = app.state::<AppState>();
    let mut sampler = state
        .sampler
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    if let Some(last) = sampler.last_refresh {
        std::thread::sleep(MIN_REFRESH_GAP.saturating_sub(last.elapsed()));
    }
    process_tree::refresh_system(&mut sampler.system);
    sampler.last_refresh = Some(Instant::now());
    process_tree::build_process_tree(&sampler.system)
}

/// Issues a new stream id and supersedes every running stream.
#[tauri::command]
pub fn begin_stream(state: State<AppState>) -> u64 {
    state.latest_stream.fetch_add(1, Ordering::SeqCst) + 1
}

/// Streams the full process tree while `stream_id` (from `begin_stream`) is the
/// latest stream and `stop_stream` has not been called for it.
#[tauri::command]
pub async fn stream_processes(
    app: AppHandle,
    on_update: Channel<Vec<ProcessInfo>>,
    stream_id: u64,
    interval_ms: u64,
) -> Result<(), String> {
    let interval = Duration::from_millis(interval_ms).max(MIN_REFRESH_GAP);
    let state = app.state::<AppState>();
    let is_current = || state.latest_stream.load(Ordering::SeqCst) == stream_id;

    while is_current() {
        let handle = app.clone();
        let tree = tauri::async_runtime::spawn_blocking(move || snapshot_tree(&handle))
            .await
            .map_err(|e| e.to_string())?;

        if !is_current() || on_update.send(tree).is_err() {
            break;
        }

        tokio::time::sleep(interval).await;
    }

    Ok(())
}

#[tauri::command]
pub fn stop_stream(state: State<AppState>, stream_id: u64) {
    let _ = state.latest_stream.compare_exchange(
        stream_id,
        stream_id + 1,
        Ordering::SeqCst,
        Ordering::SeqCst,
    );
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
