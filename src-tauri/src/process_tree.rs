use std::collections::HashMap;
use sysinfo::{Pid, ProcessesToUpdate, System, UpdateKind, ProcessRefreshKind};

use crate::types::{ProcessInfo, ProcessDelta, ProcessUpdate};

/// Get the parent PID via `ps` as fallback when sysinfo returns None
fn get_ppid_fallback(pid: u32) -> Option<u32> {
    std::process::Command::new("ps")
        .args(["-p", &pid.to_string(), "-o", "ppid="])
        .output()
        .ok()
        .and_then(|output| {
            String::from_utf8_lossy(&output.stdout)
                .trim()
                .parse::<u32>()
                .ok()
        })
}

fn status_to_string(status: sysinfo::ProcessStatus) -> String {
    match status {
        sysinfo::ProcessStatus::Run => "Run".into(),
        sysinfo::ProcessStatus::Sleep => "Sleep".into(),
        sysinfo::ProcessStatus::Stop => "Stop".into(),
        sysinfo::ProcessStatus::Zombie => "Zombie".into(),
        sysinfo::ProcessStatus::Idle => "Idle".into(),
        _ => "Unknown".into(),
    }
}

pub fn build_process_tree(system: &System) -> Vec<ProcessInfo> {
    let processes = system.processes();

    // Build parent -> children map
    let mut children_map: HashMap<u32, Vec<u32>> = HashMap::new();
    let mut process_pids: Vec<u32> = Vec::new();
    let mut ppid_map: HashMap<u32, Option<u32>> = HashMap::new();

    for (pid, process) in processes {
        let pid_u32 = pid.as_u32();
        process_pids.push(pid_u32);

        let ppid = process
            .parent()
            .map(|p| p.as_u32())
            .or_else(|| get_ppid_fallback(pid_u32));

        ppid_map.insert(pid_u32, ppid);

        if let Some(parent_pid) = ppid {
            children_map.entry(parent_pid).or_default().push(pid_u32);
        }
    }

    // Sort children by name for consistent ordering
    for children in children_map.values_mut() {
        children.sort_by(|a, b| {
            let name_a = processes
                .get(&Pid::from_u32(*a))
                .map(|p| p.name().to_string_lossy().to_string())
                .unwrap_or_default();
            let name_b = processes
                .get(&Pid::from_u32(*b))
                .map(|p| p.name().to_string_lossy().to_string())
                .unwrap_or_default();
            name_a.to_lowercase().cmp(&name_b.to_lowercase())
        });
    }

    // Find root processes (parent not in our process list or ppid is 0)
    let pid_set: std::collections::HashSet<u32> = process_pids.iter().copied().collect();
    let mut roots: Vec<u32> = process_pids
        .iter()
        .filter(|pid| {
            let ppid = ppid_map.get(pid).copied().flatten();
            match ppid {
                None => true,
                Some(0) => true,
                Some(parent) => !pid_set.contains(&parent),
            }
        })
        .copied()
        .collect();

    roots.sort_by(|a, b| {
        let name_a = processes
            .get(&Pid::from_u32(*a))
            .map(|p| p.name().to_string_lossy().to_string())
            .unwrap_or_default();
        let name_b = processes
            .get(&Pid::from_u32(*b))
            .map(|p| p.name().to_string_lossy().to_string())
            .unwrap_or_default();
        name_a.to_lowercase().cmp(&name_b.to_lowercase())
    });

    // DFS to build flat pre-order list
    let mut result = Vec::new();
    let mut stack: Vec<(u32, u32)> = Vec::new(); // (pid, depth)

    for root in roots.into_iter().rev() {
        stack.push((root, 0));
    }

    while let Some((pid, depth)) = stack.pop() {
        let Some(process) = processes.get(&Pid::from_u32(pid)) else {
            continue;
        };

        let has_children = children_map
            .get(&pid)
            .map(|c| !c.is_empty())
            .unwrap_or(false);

        result.push(ProcessInfo {
            pid,
            ppid: ppid_map.get(&pid).copied().flatten(),
            name: process.name().to_string_lossy().to_string(),
            cpu: process.cpu_usage(),
            memory: process.memory(),
            status: status_to_string(process.status()),
            exe: process
                .exe()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default(),
            cmd: process.cmd().iter().map(|s| s.to_string_lossy().to_string()).collect(),
            depth,
            has_children,
        });

        // Push children in reverse order so they come out in sorted order
        if let Some(children) = children_map.get(&pid) {
            for child in children.iter().rev() {
                stack.push((*child, depth + 1));
            }
        }
    }

    result
}

/// Snapshot of a process for delta comparison
#[derive(Clone)]
pub struct ProcessSnapshot {
    pub ppid: Option<u32>,
    pub name: String,
    pub cpu: f32,
    pub memory: u64,
    pub status: String,
    pub depth: u32,
    pub has_children: bool,
}

impl ProcessSnapshot {
    fn from_info(info: &ProcessInfo) -> Self {
        Self {
            ppid: info.ppid,
            name: info.name.clone(),
            cpu: info.cpu,
            memory: info.memory,
            status: info.status.clone(),
            depth: info.depth,
            has_children: info.has_children,
        }
    }
}

const CPU_THRESHOLD: f32 = 0.1;

/// Compute delta between current tree and previous snapshot.
/// Updates `prev_snapshot` in place for the next tick.
pub fn compute_delta(
    current: &[ProcessInfo],
    prev_snapshot: &mut HashMap<u32, ProcessSnapshot>,
) -> ProcessDelta {
    if prev_snapshot.is_empty() {
        // First tick: send everything as "added", mark as full snapshot
        for p in current {
            prev_snapshot.insert(p.pid, ProcessSnapshot::from_info(p));
        }
        return ProcessDelta {
            added: current.to_vec(),
            updated: vec![],
            removed: vec![],
            is_full: true,
        };
    }

    let mut added = Vec::new();
    let mut updated = Vec::new();
    let current_pids: std::collections::HashSet<u32> = current.iter().map(|p| p.pid).collect();

    for p in current {
        match prev_snapshot.get(&p.pid) {
            None => {
                // New process
                added.push(p.clone());
                prev_snapshot.insert(p.pid, ProcessSnapshot::from_info(p));
            }
            Some(prev) => {
                // Check if values changed beyond threshold
                let cpu_changed = (p.cpu - prev.cpu).abs() > CPU_THRESHOLD;
                let mem_changed = p.memory != prev.memory;
                let status_changed = p.status != prev.status;
                let depth_changed = p.depth != prev.depth;
                let children_changed = p.has_children != prev.has_children;
                let name_changed = p.name != prev.name;
                let ppid_changed = p.ppid != prev.ppid;

                if cpu_changed || mem_changed || status_changed || depth_changed
                    || children_changed || name_changed || ppid_changed
                {
                    if name_changed || ppid_changed {
                        // Structural change: treat as re-add
                        added.push(p.clone());
                    } else {
                        updated.push(ProcessUpdate {
                            pid: p.pid,
                            cpu: p.cpu,
                            memory: p.memory,
                            status: p.status.clone(),
                            depth: p.depth,
                            has_children: p.has_children,
                        });
                    }
                    prev_snapshot.insert(p.pid, ProcessSnapshot::from_info(p));
                }
            }
        }
    }

    // Find removed processes
    let removed: Vec<u32> = prev_snapshot
        .keys()
        .filter(|pid| !current_pids.contains(pid))
        .copied()
        .collect();

    for pid in &removed {
        prev_snapshot.remove(pid);
    }

    ProcessDelta {
        added,
        updated,
        removed,
        is_full: false,
    }
}

pub fn refresh_kind() -> ProcessRefreshKind {
    ProcessRefreshKind::nothing()
        .with_cpu()
        .with_memory()
        .with_exe(UpdateKind::OnlyIfNotSet)
        .with_cmd(UpdateKind::OnlyIfNotSet)
}

pub fn refresh_system(system: &mut System) {
    system.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        refresh_kind(),
    );
}
