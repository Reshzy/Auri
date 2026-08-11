"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/features/settings/form-status";
import {
  finalizeReportAction,
  refreshSnapshotsAction,
  reopenReportAction,
  type ReportActionState,
} from "@/features/reports/actions";

const initial: ReportActionState = {};

export function ReportStatusActions({
  reportId,
  status,
}: {
  reportId: string;
  status: string;
  /** @deprecated unused — status drives action availability */
  readOnly?: boolean;
}) {
  const [finalizeState, finalizeAction] = useActionState(finalizeReportAction, initial);
  const [reopenState, reopenAction] = useActionState(reopenReportAction, initial);
  const [refreshState, refreshAction] = useActionState(refreshSnapshotsAction, initial);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const editable = status === "draft" || status === "ready";

  return (
    <div className="space-y-4">
      <FormMessage
        error={finalizeState.error ?? reopenState.error ?? refreshState.error}
        success={finalizeState.success ?? reopenState.success ?? refreshState.success}
      />

      {editable ? (
        <div className="flex flex-wrap gap-3">
          <form action={finalizeAction}>
            <input type="hidden" name="reportId" value={reportId} />
            <SubmitButton idleLabel="Finalize report" pendingLabel="Finalizing…" />
          </form>

          {!confirmRefresh ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmRefresh(true)}
            >
              Refresh from current settings
            </Button>
          ) : null}
        </div>
      ) : null}

      {confirmRefresh ? (
        <form
          action={refreshAction}
          className="border-auri-border space-y-3 rounded-2xl border p-4"
        >
          <input type="hidden" name="reportId" value={reportId} />
          <input type="hidden" name="confirm" value="yes" />
          <p className="text-auri-ink text-sm">
            Replace this report’s profile, schedule, and signatory snapshots with your
            current settings? Day classifications already saved are not rewritten.
          </p>
          <div className="flex flex-wrap gap-2">
            <SubmitButton idleLabel="Confirm refresh" pendingLabel="Refreshing…" />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmRefresh(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {status === "finalized" ? (
        !confirmReopen ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmReopen(true)}
          >
            Reopen report
          </Button>
        ) : (
          <form
            action={reopenAction}
            className="border-auri-border space-y-3 rounded-2xl border p-4"
          >
            <input type="hidden" name="reportId" value={reportId} />
            <input type="hidden" name="confirm" value="yes" />
            <p className="text-auri-ink text-sm">
              Reopening makes the report editable again and marks any existing exports as
              not current. Historical export rows are kept.
            </p>
            <div className="flex flex-wrap gap-2">
              <SubmitButton idleLabel="Confirm reopen" pendingLabel="Reopening…" />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmReopen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )
      ) : null}
    </div>
  );
}
