"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WeeklyReportModal } from "@/components/weekly-report-modal";
import { FileText } from "lucide-react";

export function WeeklyReportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <FileText className="mr-2 h-4 w-4" />
        Generate Weekly Report
      </Button>
      <WeeklyReportModal open={open} onOpenChange={setOpen} />
    </>
  );
}
