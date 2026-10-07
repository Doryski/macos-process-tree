export type ProcessInfo = {
  pid: number;
  ppid: number | null;
  name: string;
  cpu: number;
  memory: number;
  status: string;
  exe: string;
  depth: number;
  has_children: boolean;
};
