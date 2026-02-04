"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getWeeklyReport, type WeeklyReportData } from "@/app/actions/customers";
import { Copy } from "lucide-react";

type WeeklyReportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WeeklyReportModal({ open, onOpenChange }: WeeklyReportModalProps) {
  const [isPending, startTransition] = useTransition();
  const [weekEndingDate, setWeekEndingDate] = useState("");
  const [reportData, setReportData] = useState<WeeklyReportData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const reportTextRef = useRef<HTMLPreElement>(null);

  // Reset the report data when modal opens
  useEffect(() => {
    if (open) {
      setReportData(null);
      setError(null);
      setCopySuccess(false);
    }
  }, [open]);

  const handleGenerateReport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setReportData(null);

    if (!weekEndingDate) {
      setError("Please select a week ending date");
      return;
    }

    startTransition(async () => {
      try {
        const data = await getWeeklyReport({ weekEndingDate });
        setReportData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate report");
      }
    });
  };

  const formatDate = (date: Date | string) => {
    let d: Date;
    if (typeof date === "string") {
      // Parse YYYY-MM-DD format in local timezone to avoid timezone issues
      const [year, month, day] = date.split('-').map(Number);
      d = new Date(year, month - 1, day);
    } else {
      d = date;
    }
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getWeekStartDate = () => {
    if (!weekEndingDate) return "";
    // Parse YYYY-MM-DD format in local timezone to avoid timezone issues
    const [year, month, day] = weekEndingDate.split('-').map(Number);
    const endDate = new Date(year, month - 1, day);
    const startDate = new Date(endDate);
    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = startDate.getDay();
    // Calculate days to subtract to get to Monday
    // If Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return formatDate(startDate);
  };

  const stripHtml = (html: string) => {
    // Remove HTML tags and convert to plain text
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const cleanExecutiveSummary = (summary: string) => {
    // Remove redundant heading lines like "**Executive Summary for [Customer] – Week of [Date]**"
    // These are superfluous since we already have an "EXECUTIVE SUMMARY:" section header
    const lines = summary.split('\n');
    const cleanedLines = lines.filter(line => {
      const trimmed = line.trim();
      // Remove lines that start with "**Executive Summary" or similar patterns
      if (trimmed.match(/^\*\*Executive Summary/i)) {
        return false;
      }
      // Remove lines that are just the closing "**" after the heading
      if (trimmed === '**' && lines[lines.indexOf(line) - 1]?.trim().match(/^\*\*Executive Summary/i)) {
        return false;
      }
      return true;
    });
    return cleanedLines.join('\n').trim();
  };

  const generateAsciiReport = () => {
    if (!reportData) return "";

    let report = "";
    const separator = "=".repeat(42);
    const thinSeparator = "-".repeat(50);

    // Header
    report += separator + "\n";
    report += "WEEKLY CUSTOMER REPORT\n";
    report += `Week of ${getWeekStartDate()} - ${formatDate(weekEndingDate)}\n`;
    report += separator + "\n\n";

    // Process each customer
    reportData.forEach((item, index) => {
      if (index > 0) {
        report += "\n" + separator + "\n\n";
      }

      // Customer name
      report += `CUSTOMER: ${item.customer.name}\n`;
      report += thinSeparator + "\n\n";

      // Customer details
      report += `LTS Progress: [${item.customer.topology.toUpperCase()}] Stage ${item.customer.dumbledoreStage}\n`;
      report += `Last Patch Date: ${item.customer.lastPatchDate ? formatDate(item.customer.lastPatchDate) : "N/A"}\n`;
      report += `Last Patch Version: ${item.customer.lastPatchVersion || "N/A"}\n`;
      report += `Temperament: ${item.customer.temperament.charAt(0).toUpperCase() + item.customer.temperament.slice(1)}\n`;
      report += "\n";

      // Executive Summary (AI-generated)
      if (item.executiveSummary) {
        report += "EXECUTIVE SUMMARY:\n";
        report += thinSeparator + "\n";
        report += `${cleanExecutiveSummary(item.executiveSummary)}\n\n`;
      }

      // Notes section
      if (item.notes.length > 0) {
        report += `NOTES FOR THIS WEEK (${item.notes.length}):\n`;
        report += thinSeparator + "\n\n";

        item.notes.forEach((note, noteIndex) => {
          if (noteIndex > 0) {
            report += "\n";
          }
          report += `[${formatDateTime(note.createdAt)}]\n`;
          const noteText = stripHtml(note.note);
          report += `${noteText}\n`;
        });
      } else {
        report += "NOTES FOR THIS WEEK:\n";
        report += thinSeparator + "\n";
        report += "No notes recorded for this week\n";
      }
    });

    report += "\n" + separator + "\n";
    report += "End of Report\n";
    report += separator + "\n";

    return report;
  };

  const handleCopy = async () => {
    const reportText = generateAsciiReport();
    try {
      await navigator.clipboard.writeText(reportText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Weekly Report</DialogTitle>
          <DialogDescription>
            Select a week ending date to generate a report of all customer activities
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleGenerateReport} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weekEndingDate">Week Ending Date</Label>
            <Input
              id="weekEndingDate"
              type="date"
              value={weekEndingDate}
              onChange={(e) => setWeekEndingDate(e.target.value)}
              required
            />
            {weekEndingDate && (
              <p className="text-sm text-muted-foreground">
                Report will include data from {getWeekStartDate()} to {formatDate(weekEndingDate)}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Generating..." : "Generate Report"}
            </Button>
            {reportData && reportData.length > 0 && (
              <Button type="button" variant="outline" onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                {copySuccess ? "Copied!" : "Copy to Clipboard"}
              </Button>
            )}
          </div>
        </form>

        {reportData && reportData.length > 0 && (
          <div className="mt-6 border-t pt-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Weekly Customer Report
              </h2>
              <p className="text-sm text-gray-600">
                ASCII text format - ready to copy and paste into email
              </p>
            </div>

            <div className="relative">
              <pre
                ref={reportTextRef}
                className="bg-gray-50 text-gray-900 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap break-words border border-gray-300 overflow-hidden"
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
              >
                {generateAsciiReport()}
              </pre>
            </div>
          </div>
        )}

        {reportData && reportData.length === 0 && (
          <div className="mt-6 text-center text-gray-600">
            <p>No customers found for the selected week.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
