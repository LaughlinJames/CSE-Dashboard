"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArchiveButton } from "@/components/archive-button";
import { CustomerDetailModal } from "@/components/customer-detail-modal";
import { ExternalLink } from "lucide-react";

type Customer = {
  id: number;
  name: string;
  lastPatchDate: string | null;
  lastPatchVersion: string | null;
  temperament: string;
  topology: string;
  dumbledoreStage: number;
  mscUrl: string | null;
  runbookUrl: string | null;
  snowUrl: string | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

type CustomerWithNote = Customer & {
  latestNote: string | null;
  latestNoteDate: Date | null;
};

type CustomerCardProps = {
  customer: CustomerWithNote;
  archived?: boolean;
};

export function CustomerCard({ customer, archived = false }: CustomerCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper function to format dates
  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper function to get badge variant based on topology
  const getTopologyVariant = (topology: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (topology.toLowerCase()) {
      case "prod":
        return "destructive";
      case "stage":
        return "default";
      case "qa":
        return "secondary";
      case "dev":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Helper function to get badge variant and emoji based on temperament
  const getTemperamentDisplay = (temperament: string): { variant: "default" | "secondary" | "destructive" | "outline", label: string } => {
    switch (temperament.toLowerCase()) {
      case "happy":
        return { variant: "default", label: "😊 Happy" };
      case "satisfied":
        return { variant: "default", label: "🙂 Satisfied" };
      case "neutral":
        return { variant: "secondary", label: "😐 Neutral" };
      case "concerned":
        return { variant: "outline", label: "😟 Concerned" };
      case "frustrated":
        return { variant: "destructive", label: "😤 Frustrated" };
      default:
        return { variant: "secondary", label: "😐 Neutral" };
    }
  };

  return (
    <>
      <Card 
        className={`flex flex-col cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${archived ? 'opacity-60' : ''}`}
        onClick={() => setIsModalOpen(true)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl flex-1">{customer.name}</CardTitle>
            <div 
              onClick={(e) => e.stopPropagation()}
            >
              <ArchiveButton customerId={customer.id} archived={customer.archived} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Customer Temperament:</span>
              <Badge variant={getTemperamentDisplay(customer.temperament).variant}>
                {getTemperamentDisplay(customer.temperament).label}
              </Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">LTS Progress:</span>
              <div className="flex gap-2">
                <Badge variant={getTopologyVariant(customer.topology)}>
                  {customer.topology.toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  Stage {customer.dumbledoreStage}
                </Badge>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Patch:</span>
              <span className="font-medium">
                {formatDate(customer.lastPatchDate)}
              </span>
            </div>
            {customer.lastPatchVersion && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Patch Version:</span>
                <span className="font-medium">
                  {customer.lastPatchVersion}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Updated:</span>
              <span className="font-medium">
                {formatDate(customer.updatedAt)}
              </span>
            </div>
          </div>

          {customer.latestNote && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Latest Note ({formatDate(customer.latestNoteDate)}):
              </p>
              <div 
                className="text-sm text-foreground line-clamp-3 prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline"
                dangerouslySetInnerHTML={{ __html: customer.latestNote }}
              />
            </div>
          )}

          {!customer.latestNote && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground italic">
                No notes yet
              </p>
            </div>
          )}

          {/* MSC, Runbook, and SNOW Buttons */}
          {(customer.mscUrl || customer.runbookUrl || customer.snowUrl) && (
            <div className="pt-4 border-t flex gap-2">
              {customer.mscUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(customer.mscUrl!, "_blank", "noopener,noreferrer");
                  }}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  MSC
                </Button>
              )}
              {customer.runbookUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(customer.runbookUrl!, "_blank", "noopener,noreferrer");
                  }}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Runbook
                </Button>
              )}
              {customer.snowUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(customer.snowUrl!, "_blank", "noopener,noreferrer");
                  }}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  SNOW
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerDetailModal
        customer={customer}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}
