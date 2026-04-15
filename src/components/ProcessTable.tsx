import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ProcessInfo } from "../types/process";
import type { SparklineHistory } from "../hooks/useSparklineHistory";
import { ProcessRow } from "./ProcessRow";

const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 28;

function ProcessTableHeader() {
  return (
    <div
      className="flex items-center gap-3 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-1 select-none shrink-0"
      style={{ height: HEADER_HEIGHT }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="shrink-0" style={{ width: 44 }} />
        <span className="flex-1 min-w-0">Name</span>
      </div>
      <span className="font-mono w-[55px] shrink-0 text-right">PID</span>
      <span className="w-[115px] shrink-0 text-right">CPU</span>
      <span className="w-[135px] shrink-0 text-right">Memory</span>
      <span className="w-[52px] shrink-0 text-center">Status</span>
      <span className="shrink-0 text-right" style={{ width: 92, marginRight: 8 }}>Actions</span>
    </div>
  );
}

type ProcessTableProps = {
  rows: readonly (ProcessInfo & { isDirectMatch?: boolean })[];
  expandedPids: ReadonlySet<number>;
  selectedPids: ReadonlySet<number>;
  onToggle: (pid: number) => void;
  onKill: (pid: number, signal: number) => void;
  onSelectToggle: (pid: number, shiftKey: boolean) => void;
  sparklineHistory: SparklineHistory;
};

export function ProcessTable({
  rows,
  expandedPids,
  selectedPids,
  onToggle,
  onKill,
  onSelectToggle,
  sparklineHistory,
}: ProcessTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  return (
    <div className="flex flex-col h-[calc(100vh-44px)]">
      <ProcessTableHeader />

      {/* Virtualized rows */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        style={{ contain: "strict", willChange: "transform" }}
      >
        <div
          className="w-full relative"
          style={{ height: virtualizer.getTotalSize() }}
        >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const process = rows[virtualRow.index];
          const history = sparklineHistory.get(process.pid);
          return (
            <div
              key={process.pid}
              className="absolute top-0 left-0 w-full"
              style={{
                height: ROW_HEIGHT,
                transform: `translateY(${virtualRow.start}px)`,
                contain: "layout paint",
                contentVisibility: "auto",
                containIntrinsicSize: "0 32px",
              }}
            >
              <ProcessRow
                process={process}
                isExpanded={expandedPids.has(process.pid)}
                isSelected={selectedPids.has(process.pid)}
                onToggle={onToggle}
                onKill={onKill}
                onSelectToggle={onSelectToggle}
                cpuHistory={history?.cpu}
                memHistory={history?.mem}
              />
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
