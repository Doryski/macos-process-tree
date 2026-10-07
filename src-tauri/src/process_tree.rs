use std::collections::HashMap;
use sysinfo::{Pid, ProcessesToUpdate, System, UpdateKind, ProcessRefreshKind};

use crate::types::ProcessInfo;

#[repr(C)]
#[allow(dead_code)]
struct ProcBsdShortInfo {
    pbsi_pid: u32,
    pbsi_ppid: u32,
    pbsi_pgid: u32,
    pbsi_status: u32,
    pbsi_comm: [u8; 16],
    pbsi_flags: u32,
    pbsi_uid: u32,
    pbsi_gid: u32,
    pbsi_ruid: u32,
    pbsi_rgid: u32,
    pbsi_svuid: u32,
    pbsi_svgid: u32,
    pbsi_rfu: u32,
}

const PROC_PIDT_SHORTBSDINFO: i32 = 13;

fn get_ppid_fallback(pid: u32) -> Option<u32> {
    let mut info = std::mem::MaybeUninit::<ProcBsdShortInfo>::zeroed();
    let size = std::mem::size_of::<ProcBsdShortInfo>() as i32;
    let written = unsafe {
        libc::proc_pidinfo(
            pid as i32,
            PROC_PIDT_SHORTBSDINFO,
            0,
            info.as_mut_ptr().cast(),
            size,
        )
    };
    (written == size).then(|| unsafe { info.assume_init() }.pbsi_ppid)
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

    let sort_key = |pid: &u32| {
        processes
            .get(&Pid::from_u32(*pid))
            .map(|p| p.name().to_string_lossy().to_lowercase())
            .unwrap_or_default()
    };

    // Sort children by name for consistent ordering
    for children in children_map.values_mut() {
        children.sort_by_cached_key(sort_key);
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

    roots.sort_by_cached_key(sort_key);

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

pub fn refresh_kind() -> ProcessRefreshKind {
    ProcessRefreshKind::nothing()
        .with_cpu()
        .with_memory()
        .with_exe(UpdateKind::OnlyIfNotSet)
}

pub fn refresh_system(system: &mut System) {
    system.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        refresh_kind(),
    );
}
