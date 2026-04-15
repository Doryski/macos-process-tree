use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub ppid: Option<u32>,
    pub name: String,
    pub cpu: f32,
    pub memory: u64,
    pub status: String,
    pub exe: String,
    pub cmd: Vec<String>,
    pub depth: u32,
    pub has_children: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct KillResult {
    pub pid: u32,
    pub success: bool,
    pub error: Option<String>,
}

/// Delta update: only changed/added/removed processes since last tick
#[derive(Debug, Clone, Serialize)]
pub struct ProcessDelta {
    /// Full tree on first tick, only added processes on subsequent ticks
    pub added: Vec<ProcessInfo>,
    /// Processes with changed cpu/memory/status values
    pub updated: Vec<ProcessUpdate>,
    /// PIDs of processes that no longer exist
    pub removed: Vec<u32>,
    /// True on the very first tick (frontend should replace, not merge)
    pub is_full: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProcessUpdate {
    pub pid: u32,
    pub cpu: f32,
    pub memory: u64,
    pub status: String,
    pub depth: u32,
    pub has_children: bool,
}
