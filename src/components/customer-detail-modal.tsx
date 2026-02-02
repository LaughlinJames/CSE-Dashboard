"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { updateCustomer, addNote, getCustomerNotes } from "@/app/actions/customers";
import { useEffect } from "react";

type Customer = {
  id: number;
  name: string;
  lastPatchDate: string | null;
  lastPatchVersion: string | null;
  topology: string;
  dumbledoreStage: number;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

type Note = {
  id: number;
  customerId: number;
  note: string;
  createdAt: Date;
  userId: string;
};

type CustomerDetailModalProps = {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CustomerDetailModal({ customer, open, onOpenChange }: CustomerDetailModalProps) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for editing
  const [name, setName] = useState("");
  const [lastPatchDate, setLastPatchDate] = useState("");
  const [lastPatchVersion, setLastPatchVersion] = useState("");
  const [topology, setTopology] = useState<"dev" | "qa" | "stage" | "prod">("dev");
  const [dumbledoreStage, setDumbledoreStage] = useState(1);

  // Load customer data and notes when modal opens
  useEffect(() => {
    if (open && customer) {
      setName(customer.name);
      setLastPatchDate(customer.lastPatchDate || "");
      setLastPatchVersion(customer.lastPatchVersion || "");
      setTopology(customer.topology as "dev" | "qa" | "stage" | "prod");
      setDumbledoreStage(customer.dumbledoreStage);
      setNewNote("");
      setError(null);
      setSuccess(null);

      // Fetch notes
      setIsLoadingNotes(true);
      getCustomerNotes(customer.id)
        .then((fetchedNotes) => {
          setNotes(fetchedNotes);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load notes");
        })
        .finally(() => {
          setIsLoadingNotes(false);
        });
    }
  }, [open, customer]);

  if (!customer) return null;

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        // Update customer information
        await updateCustomer({
          id: customer.id,
          name,
          lastPatchDate: lastPatchDate || null,
          lastPatchVersion: lastPatchVersion || null,
          topology,
          dumbledoreStage,
        });

        // Add note only if there is content
        if (newNote.trim()) {
          await addNote({
            customerId: customer.id,
            note: newNote,
          });
          
          // Refresh notes list
          const updatedNotes = await getCustomerNotes(customer.id);
          setNotes(updatedNotes);
          setNewNote("");
        }

        setSuccess("Customer updated successfully!");
        
        // Close the modal after successful update
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update customer");
      }
    });
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateInput = (date: string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
          <DialogDescription>
            View and edit customer information and add notes
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/15 text-green-700 dark:text-green-400 px-4 py-3 rounded-md text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Customer Details Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastPatchDate">Last Patch Date</Label>
                <Input
                  id="lastPatchDate"
                  type="date"
                  value={formatDateInput(lastPatchDate)}
                  onChange={(e) => setLastPatchDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastPatchVersion">Last Patch Version</Label>
                <Input
                  id="lastPatchVersion"
                  type="text"
                  placeholder="e.g., v1.2.3"
                  value={lastPatchVersion}
                  onChange={(e) => setLastPatchVersion(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="topology">Topology</Label>
                  <Select value={topology} onValueChange={(value: "dev" | "qa" | "stage" | "prod") => setTopology(value)}>
                    <SelectTrigger id="topology">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dev">Dev</SelectItem>
                      <SelectItem value="qa">QA</SelectItem>
                      <SelectItem value="stage">Stage</SelectItem>
                      <SelectItem value="prod">Prod</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dumbledoreStage">Dumbledore Stage</Label>
                  <Select 
                    value={dumbledoreStage.toString()} 
                    onValueChange={(value) => setDumbledoreStage(parseInt(value))}
                  >
                    <SelectTrigger id="dumbledoreStage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((stage) => (
                        <SelectItem key={stage} value={stage.toString()}>
                          Stage {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Add Note Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Add Note (Optional)</h3>
            <div className="space-y-2">
              <Label htmlFor="newNote">New Note</Label>
              <Textarea
                id="newNote"
                placeholder="Enter a note (optional)..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Single Update Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Updating..." : "Update"}
            </Button>
          </div>

          {/* Notes List */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Previous Notes</h3>
            <div className="space-y-3">
              {isLoadingNotes ? (
                <p className="text-sm text-muted-foreground">Loading notes...</p>
              ) : notes.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No notes yet</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-muted/50 p-4 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {formatDate(note.createdAt)}
                        </Badge>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
