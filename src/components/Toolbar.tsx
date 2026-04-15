import { useCallback, useState } from "react";
import type { SearchMode } from "@/lib/filter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Maximize2, Minimize2, RefreshCw, Search } from "lucide-react";

const REFRESH_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "1s", value: 1000 },
  { label: "2s", value: 2000 },
  { label: "5s", value: 5000 },
] as const;

// Inline padding — Tailwind v4's padding-inline doesn't
// override the base `padding: 0` reset in Tauri's WebKit.
const btnPx = { paddingLeft: 8, paddingRight: 8 } as const;
const iconBtnPx = { paddingLeft: 6, paddingRight: 6 } as const;

type ToolbarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  includeSubprocesses: boolean;
  onIncludeSubprocessesChange: (value: boolean) => void;
  refreshInterval: number;
  onRefreshIntervalChange: (interval: number) => void;
  onRefreshNow: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  totalCount: number;
  filteredCount: number;
  selectedCount: number;
  onBulkTerm: () => void;
  onBulkKill: () => void;
  onClearSelection: () => void;
};

export function Toolbar({
  searchQuery,
  onSearchChange,
  searchMode,
  onSearchModeChange,
  includeSubprocesses,
  onIncludeSubprocessesChange,
  refreshInterval,
  onRefreshIntervalChange,
  onRefreshNow,
  onExpandAll,
  onCollapseAll,
  totalCount,
  filteredCount,
  selectedCount,
  onBulkTerm,
  onBulkKill,
  onClearSelection,
}: ToolbarProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onSearchChange("");
    },
    [onSearchChange]
  );

  const [spinCount, setSpinCount] = useState(0);

  const handleRefreshNow = useCallback(() => {
    setSpinCount((c) => c + 1);
    onRefreshNow();
  }, [onRefreshNow]);

  const toggleSearchMode = useCallback(
    () => onSearchModeChange(searchMode === "regex" ? "fuzzy" : "regex"),
    [searchMode, onSearchModeChange]
  );

  const toggleSubprocesses = useCallback(
    () => onIncludeSubprocessesChange(!includeSubprocesses),
    [includeSubprocesses, onIncludeSubprocessesChange]
  );

  return (
    <div
      data-tauri-drag-region
      className="flex items-center gap-2 pr-3 py-2 border-b border-border bg-surface-1 h-11 text-xs"
      style={{ paddingLeft: "calc(var(--traffic-light-width) + 16px)" }}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-[300px]">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder={`Search (${searchMode})...`}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-surface-0 border border-border text-foreground placeholder:text-muted-foreground rounded-md text-xs outline-none focus:border-ring transition-colors"
          style={{ paddingLeft: 28, paddingRight: 8, height: 24 }}
        />
      </div>

      {/* Search mode toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="xs"
            style={btnPx}
            onClick={toggleSearchMode}
            className={cn(
              "transition-colors",
              searchMode === "fuzzy" && "text-primary border-primary"
            )}
          >
            {searchMode === "regex" ? "Regex" : "Fuzzy"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Switch to {searchMode === "regex" ? "fuzzy" : "regex"} search
        </TooltipContent>
      </Tooltip>

      {/* Subprocess toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="xs"
            style={btnPx}
            onClick={toggleSubprocesses}
            className={cn(
              "transition-colors border",
              includeSubprocesses
                ? "text-primary border-primary"
                : "border-transparent"
            )}
          >
            + Subs
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {includeSubprocesses ? "Hide" : "Show"} subprocesses of matches
        </TooltipContent>
      </Tooltip>

      {/* Process count */}
      <span className="text-muted-foreground text-[11px]">
        {searchQuery
          ? `${filteredCount} / ${totalCount}`
          : `${totalCount} processes`}
      </span>

      {/* Bulk actions (visible when selection exists) */}
      {selectedCount > 0 && (
        <>
          <div className="w-px h-5 bg-border" />
          <span className="text-foreground text-[11px] font-medium">
            {selectedCount} selected
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="xs"
                style={btnPx}
                onClick={onBulkTerm}
                className="text-amber-500/70 hover:text-amber-500 hover:border-amber-500/50 transition-colors"
              >
                TERM Selected
              </Button>
            </TooltipTrigger>
            <TooltipContent>SIGTERM selected processes</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="xs"
                style={btnPx}
                onClick={onBulkKill}
                className="text-red-500/70 hover:text-red-500 hover:border-red-500/50 transition-colors"
              >
                KILL Selected
              </Button>
            </TooltipTrigger>
            <TooltipContent>SIGKILL selected processes</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="xs"
                style={btnPx}
                onClick={onClearSelection}
              >
                Clear
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear selection</TooltipContent>
          </Tooltip>
        </>
      )}

      {/* Expand/Collapse */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon-xs"
            style={iconBtnPx}
            onClick={onExpandAll}
          >
            <Maximize2 className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Expand all</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon-xs"
            style={iconBtnPx}
            onClick={onCollapseAll}
          >
            <Minimize2 className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Collapse all</TooltipContent>
      </Tooltip>

      {/* Divider */}
      <div className="w-px h-5 bg-border" />

      {/* Refresh controls */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon-xs"
            style={iconBtnPx}
            onClick={handleRefreshNow}
          >
            <RefreshCw className="size-3 transition-transform duration-1000" style={{ transform: `rotate(${spinCount * 360}deg)` }} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh now</TooltipContent>
      </Tooltip>

      <Select
        value={String(refreshInterval)}
        onValueChange={(value) => onRefreshIntervalChange(Number(value))}
      >
        <SelectTrigger
          size="sm"
          className="text-[11px] min-w-[60px]"
          style={{ ...btnPx, height: 24, paddingTop: 0, paddingBottom: 0 }}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {REFRESH_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
