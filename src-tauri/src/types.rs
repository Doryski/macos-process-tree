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
    pub depth: u32,
    pub has_children: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct KillResult {
    pub pid: u32,
    pub success: bool,
    pub error: Option<String>,
}
