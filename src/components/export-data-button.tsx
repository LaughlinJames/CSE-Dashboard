"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { exportAllUserData } from "@/app/actions/export-data";
import { Download } from "lucide-react";
import { toast } from "sonner";

function getExportFilename() {
  const date = new Date().toISOString().slice(0, 10);
  return `cse-whiteboard-export-${date}.json`;
}

export function ExportDataButton() {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await exportAllUserData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const filename = getExportFilename();

      // Prefer File System Access API so user can choose folder (Chrome, Edge)
      if ("showSaveFilePicker" in window) {
        try {
          const handle = await (window as Window & { showSaveFilePicker: (o?: { suggestedName?: string }) => Promise<FileSystemFileHandle> })
            .showSaveFilePicker({
              suggestedName: filename,
              types: [
                {
                  description: "JSON export",
                  accept: { "application/json": [".json"] },
                },
              ],
            });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          toast.success("Data exported to your chosen location.");
          return;
        } catch (err) {
          // User cancelled or API failed - fall back to download
          if (err instanceof Error && err.name === "AbortError") {
            toast.info("Export cancelled.");
            return;
          }
        }
      }

      // Fallback: trigger download (user can choose location via Save As)
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export downloaded. Use Save As to choose a location if needed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button onClick={handleExport} disabled={isExporting} variant="default">
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? "Exporting…" : "Export all my data"}
    </Button>
  );
}
