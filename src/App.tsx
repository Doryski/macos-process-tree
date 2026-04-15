import { useState, useDeferredValue } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useKillProcess, useKillProcesses } from "./hooks/useProcessQuery";
import { useProcessStream } from "./hooks/useProcessStream";
import { useProcessTree } from "./hooks/useProcessTree";
import { useSparklineHistory } from "./hooks/useSparklineHistory";
import { useSelection } from "./hooks/useSelection";
import { ProcessTable } from "./components/ProcessTable";
import { Toolbar } from "./components/Toolbar";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { TooltipProvider } from "./components/ui/tooltip";
import { getDescendantCount } from "./lib/child-utils";
import { loadState, saveState } from "./lib/storage";
import type { SearchMode } from "./lib/filter";

type PendingKillAction = {
  pids: number[];
  signal: number;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 500 },
  },
});

function ProcessTreeApp() {
  const [refreshInterval, setRefreshInterval] = useState(2000);
  const [searchMode, setSearchMode] = useState<SearchMode>(() =>
    loadState<SearchMode>("searchMode", "regex")
  );
  const [includeSubprocesses, setIncludeSubprocesses] = useState(() =>
    loadState("includeSubprocesses", false)
  );
  const [pendingKill, setPendingKill] = useState<PendingKillAction | null>(
    null
  );

  // Persist directly in event handlers — no useEffect needed
  const updateSearchMode = (mode: SearchMode) => {
    setSearchMode(mode);
    saveState("searchMode", mode);
  };

  const updateIncludeSubprocesses = (value: boolean) => {
    setIncludeSubprocesses(value);
    saveState("includeSubprocesses", value);
  };

  const { data: processes, refetch } = useProcessStream(refreshInterval);
  const killMutation = useKillProcess();
  const killProcessesMutation = useKillProcesses();

  // Defer process data so all downstream hooks (tree, sparklines, selection)
  // compute on a non-urgent schedule — scroll stays responsive during data refreshes
  const deferredProcesses = useDeferredValue(processes);

  const sparklineHistory = useSparklineHistory(deferredProcesses);

  const {
    visibleRows,
    expandedPids,
    searchQuery,
    setSearchQuery,
    toggle,
    expandAll,
    collapseAll,
    totalCount,
    filteredCount,
  } = useProcessTree(deferredProcesses, searchMode, includeSubprocesses);

  const { selectedPids, toggleSelect, clearSelection } =
    useSelection(visibleRows);

  // All kill actions go through confirmation
  const requestKill = (pids: number[], signal: number) => {
    setPendingKill({ pids, signal });
  };

  const handleKill = (pid: number, signal: number) =>
    requestKill([pid], signal);

  const handleBulkTerm = () => requestKill([...selectedPids], 15);

  const handleBulkKill = () => requestKill([...selectedPids], 9);

  const executeKill = () => {
    if (!pendingKill) return;

    if (pendingKill.pids.length === 1) {
      killMutation.mutate({
        pid: pendingKill.pids[0],
        signal: pendingKill.signal,
      });
    } else {
      killProcessesMutation.mutate({
        pids: pendingKill.pids,
        signal: pendingKill.signal,
      });
    }

    setPendingKill(null);
    clearSelection();
  };

  const cancelKill = () => setPendingKill(null);

  // Use raw processes (not deferred) for kill dialog — needs latest data
  const confirmDialogProps = (() => {
    if (!pendingKill || !processes) return null;

    const targets = pendingKill.pids
      .map((pid) => processes.find((p) => p.pid === pid))
      .filter((p) => p != null)
      .map((p) => ({ pid: p.pid, name: p.name }));

    const childCount = getDescendantCount(
      processes,
      new Set(pendingKill.pids)
    );

    return {
      action: (pendingKill.signal === 9 ? "SIGKILL" : "SIGTERM") as
        | "SIGKILL"
        | "SIGTERM",
      targets,
      childCount,
    };
  })();

  const handleRefreshNow = () => {
    refetch();
  };

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden">
      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchMode={searchMode}
        onSearchModeChange={updateSearchMode}
        includeSubprocesses={includeSubprocesses}
        onIncludeSubprocessesChange={updateIncludeSubprocesses}
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={setRefreshInterval}
        onRefreshNow={handleRefreshNow}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        totalCount={totalCount}
        filteredCount={filteredCount}
        selectedCount={selectedPids.size}
        onBulkTerm={handleBulkTerm}
        onBulkKill={handleBulkKill}
        onClearSelection={clearSelection}
      />
      <ProcessTable
        rows={visibleRows}
        expandedPids={expandedPids}
        selectedPids={selectedPids}
        onToggle={toggle}
        onKill={handleKill}
        onSelectToggle={toggleSelect}
        sparklineHistory={sparklineHistory}
      />
      {confirmDialogProps && (
        <ConfirmDialog
          {...confirmDialogProps}
          onConfirm={executeKill}
          onCancel={cancelKill}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ProcessTreeApp />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
