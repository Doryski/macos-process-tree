import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmDialogProps = {
  action: "SIGTERM" | "SIGKILL";
  targets: readonly { pid: number; name: string }[];
  childCount: number;
  onConfirm: () => void;
  onCancel: () => void;
};

const TITLE_COLORS = {
  SIGTERM: "text-amber-500",
  SIGKILL: "text-red-500",
} as const;

export function ConfirmDialog({
  action,
  targets,
  childCount,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isSigterm = action === "SIGTERM";

  return (
    <AlertDialog open={true} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <AlertDialogContent style={{ padding: 20, gap: 16 }}>
        <AlertDialogHeader>
          <AlertDialogTitle className={TITLE_COLORS[action]}>
            Confirm {action}
          </AlertDialogTitle>
          <AlertDialogDescription>
            The following {targets.length === 1 ? "process" : "processes"} will
            be sent {action}:
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Target list */}
        <div className="max-h-50 overflow-y-auto bg-surface-0 rounded-md font-mono text-xs leading-relaxed" style={{ padding: 8 }}>
          {targets.map((t) => (
            <div key={t.pid} className="py-0.5">
              <span className="text-foreground">{t.name}</span>{" "}
              <span className="text-muted-foreground">({t.pid})</span>
            </div>
          ))}
        </div>

        {/* Child warning */}
        {childCount > 0 && (
          <div className="text-xs text-amber-400 bg-amber-400/5 rounded-md border-l-[3px] border-amber-400" style={{ padding: 8 }}>
            This will also affect {childCount} child{" "}
            {childCount === 1 ? "process" : "processes"}
          </div>
        )}

        <AlertDialogFooter style={{ paddingTop: 4, gap: 8 }}>
          <AlertDialogCancel onClick={onCancel} style={{ paddingLeft: 16, paddingRight: 16, height: 32 }}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            variant={isSigterm ? "default" : "destructive"}
            className={isSigterm ? "bg-amber-600 hover:bg-amber-700 text-white" : undefined}
            style={{ paddingLeft: 16, paddingRight: 16, height: 32 }}
          >
            {isSigterm ? "Terminate" : "Force Kill"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
