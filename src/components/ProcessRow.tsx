import { memo } from "react";
import type { ProcessInfo } from "../types/process";
import { Sparkline } from "./Sparkline";
import { formatBytes, formatCpu } from "../lib/format";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown } from "lucide-react";

const SPARKLINE_CPU_COLOR = "#38bdf8";
const SPARKLINE_MEM_COLOR = "#2dd4bf";

const EMPTY_ARRAY: readonly number[] = [];

const btnPx = { paddingLeft: 8, paddingRight: 8 } as const;

type ProcessRowProps = {
  process: ProcessInfo & { isDirectMatch?: boolean };
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: (pid: number) => void;
  onKill: (pid: number, signal: number) => void;
  onSelectToggle: (pid: number, shiftKey: boolean) => void;
  cpuHistory: readonly number[] | undefined;
  memHistory: readonly number[] | undefined;
  style?: React.CSSProperties;
};

const statusClasses = {
  Run: "bg-green-600/10 text-green-600",
  Zombie: "bg-red-600/10 text-red-600",
} as const;

const getStatusClasses = (status: string) =>
  statusClasses[status as keyof typeof statusClasses] ??
  "bg-muted/50 text-muted-foreground";

// Value-based comparison — prevents re-render when process object
// reference changes but data is identical (every 2s data refresh)
const arePropsEqual = (prev: ProcessRowProps, next: ProcessRowProps) => {
  if (prev.isExpanded !== next.isExpanded) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.cpuHistory !== next.cpuHistory) return false;
  if (prev.memHistory !== next.memHistory) return false;

  const p = prev.process;
  const n = next.process;
  return (
    p.pid === n.pid &&
    p.name === n.name &&
    p.cpu === n.cpu &&
    p.memory === n.memory &&
    p.status === n.status &&
    p.depth === n.depth &&
    p.has_children === n.has_children &&
    p.isDirectMatch === n.isDirectMatch
  );
};

// React Compiler handles callback memoization — no manual useCallback needed
export const ProcessRow = memo(function ProcessRow({
  process,
  isExpanded,
  isSelected,
  onToggle,
  onKill,
  onSelectToggle,
  cpuHistory,
  memHistory,
  style,
}: ProcessRowProps) {
  const isDimmed = process.isDirectMatch === false;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-2 text-xs h-8 border-b border-border/30 transition-colors duration-100 cursor-pointer select-none",
        isSelected ? "bg-surface-2" : "hover:bg-surface-1",
        isDimmed && "opacity-50"
      )}
      style={style}
      onClick={(e: React.MouseEvent) => onSelectToggle(process.pid, e.shiftKey)}
    >
      {/* Left section: checkbox + expand + name — indented by depth */}
      <div
        className="flex items-center gap-3 flex-1 min-w-0"
        style={{ paddingLeft: process.depth * 16 + 8 }}
      >
        {/* Selection checkbox */}
        <Checkbox
          checked={isSelected}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onSelectToggle(process.pid, e.shiftKey);
          }}
          className="shrink-0 cursor-pointer"
        />

        {/* Expand/collapse toggle */}
        <button
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggle(process.pid); }}
          className={cn(
            "w-4 h-4 flex items-center justify-center border-none bg-transparent p-0 text-muted-foreground hover:text-foreground transition-colors",
            process.has_children
              ? "cursor-pointer visible"
              : "cursor-default invisible"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
        </button>

        {/* Process name */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-medium flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
              {process.name}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            {process.exe || process.name}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* PID */}
      <span className="text-muted-foreground font-mono w-[55px] shrink-0 text-[11px] text-right">
        {process.pid}
      </span>

      {/* CPU sparkline + value */}
      <div className="flex items-center gap-1.5 w-[115px] shrink-0">
        <Sparkline
          data={cpuHistory ?? EMPTY_ARRAY}
          color={SPARKLINE_CPU_COLOR}
        />
        <span className="font-mono text-[11px] min-w-[42px] text-right">
          {formatCpu(process.cpu)}
        </span>
      </div>

      {/* Memory sparkline + value */}
      <div className="flex items-center gap-1.5 w-[135px] shrink-0">
        <Sparkline
          data={memHistory ?? EMPTY_ARRAY}
          color={SPARKLINE_MEM_COLOR}
        />
        <span className="font-mono text-[11px] min-w-[62px] text-right">
          {formatBytes(process.memory)}
        </span>
      </div>

      {/* Status */}
      <span
        className={cn(
          "text-[10px] shrink-0 rounded w-[52px] text-center font-medium",
          getStatusClasses(process.status)
        )}
        style={{
          paddingLeft: 6,
          paddingRight: 6,
          paddingTop: 1,
          paddingBottom: 1,
        }}
      >
        {process.status}
      </span>

      {/* Kill actions — visible on row hover */}
      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100" style={{ marginRight: 8 }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              style={btnPx}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onKill(process.pid, 15); }}
              className="text-amber-500/70 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
            >
              TERM
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">SIGTERM (graceful)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              style={btnPx}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onKill(process.pid, 9); }}
              className="text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              KILL
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">SIGKILL (force)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}, arePropsEqual);
