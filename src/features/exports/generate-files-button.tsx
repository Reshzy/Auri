"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GenerationReviewPanel } from "@/features/exports/generation-review-panel";

export function GenerateFilesButton({ reportId }: { reportId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Generate
      </Button>
      <GenerationReviewPanel reportId={reportId} open={open} onOpenChange={setOpen} />
    </>
  );
}
