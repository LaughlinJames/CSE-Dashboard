"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArchiveButton } from "@/components/archive-button";
import { CustomerDetailModal } from "@/components/customer-detail-modal";

type Customer = {
  id: number;
  name: string;
  lastPatchDate: string | null;
  topology: string;
  dumbledoreStage: number;
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
              className="flex gap-2 items-start"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-2">
                <Badge variant={getTopologyVariant(customer.topology)}>
                  {customer.topology.toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  Stage {customer.dumbledoreStage}
                </Badge>
              </div>
              <ArchiveButton customerId={customer.id} archived={customer.archived} />
            </div>
          </div>
          <CardDescription>
            Customer ID: {customer.id}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Patch:</span>
              <span className="font-medium">
                {formatDate(customer.lastPatchDate)}
              </span>
            </div>
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
              <p className="text-sm line-clamp-3">
                {customer.latestNote}
              </p>
            </div>
          )}

          {!customer.latestNote && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground italic">
                No notes yet
              </p>
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
