"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/rich-text-editor";
import { AddTodoFromNoteDialog } from "@/components/add-todo-from-note-dialog";
import { updateCustomer, addNote, getCustomerNotes, getTodosByCustomer } from "@/app/actions/customers";
import { useEffect } from "react";
import { CheckSquare } from "lucide-react";
import Link from "next/link";

type Customer = {
  id: number;
  name: string;
  lastPatchDate: string | null;
  lastPatchVersion: string | null;
  temperament: string;
  topology: string;
  dumbledoreStage: number;
  patchFrequency: string;
  mscUrl: string | null;
  runbookUrl: string | null;
  snowUrl: string | null;
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
  const [newNote, setNewNote] = useState("<p></p>");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [noteTodoMap, setNoteTodoMap] = useState<Map<number, number>>(new Map()); // noteId -> todoId

  // Form state for editing
  const [name, setName] = useState("");
  const [lastPatchDate, setLastPatchDate] = useState("");
  const [lastPatchVersion, setLastPatchVersion] = useState("");
  const [temperament, setTemperament] = useState<"happy" | "satisfied" | "neutral" | "concerned" | "frustrated">("neutral");
  const [topology, setTopology] = useState<"dev" | "qa" | "stage" | "prod">("dev");
  const [dumbledoreStage, setDumbledoreStage] = useState(1);
  const [patchFrequency, setPatchFrequency] = useState<"monthly" | "quarterly">("monthly");
  const [mscUrl, setMscUrl] = useState("");
  const [runbookUrl, setRunbookUrl] = useState("");
  const [snowUrl, setSnowUrl] = useState("");

  // Load customer data and notes when modal opens
  useEffect(() => {
    if (open && customer) {
      setName(customer.name);
      setLastPatchDate(customer.lastPatchDate || "");
      setLastPatchVersion(customer.lastPatchVersion || "");
      setTemperament(customer.temperament as "happy" | "satisfied" | "neutral" | "concerned" | "frustrated");
      setTopology(customer.topology as "dev" | "qa" | "stage" | "prod");
      setDumbledoreStage(customer.dumbledoreStage);
      setPatchFrequency(customer.patchFrequency as "monthly" | "quarterly");
      setMscUrl(customer.mscUrl || "");
      setRunbookUrl(customer.runbookUrl || "");
      setSnowUrl(customer.snowUrl || "");
      setNewNote("<p></p>");
      setError(null);
      setSuccess(null);

      // Fetch notes and todos
      setIsLoadingNotes(true);
      Promise.all([
        getCustomerNotes(customer.id),
        getTodosByCustomer(customer.id)
      ])
        .then(([fetchedNotes, todos]) => {
          setNotes(fetchedNotes);
          // Create map of noteId to todoId
          const todoMap = new Map<number, number>();
          todos.forEach(todo => {
            if (todo.noteId) {
              todoMap.set(todo.noteId, todo.id);
            }
          });
          setNoteTodoMap(todoMap);
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
          temperament,
          topology,
          dumbledoreStage,
          patchFrequency,
          mscUrl: mscUrl || null,
          runbookUrl: runbookUrl || null,
          snowUrl: snowUrl || null,
        });

        // Add note only if there is content (strip HTML tags to check)
        const noteText = newNote.replace(/<[^>]*>/g, '').trim();
        if (noteText) {
          await addNote({
            customerId: customer.id,
            note: newNote,
          });
          
          // Refresh notes and todos list
          const [updatedNotes, todos] = await Promise.all([
            getCustomerNotes(customer.id),
            getTodosByCustomer(customer.id)
          ]);
          setNotes(updatedNotes);
          // Update todo map
          const todoMap = new Map<number, number>();
          todos.forEach(todo => {
            if (todo.noteId) {
              todoMap.set(todo.noteId, todo.id);
            }
          });
          setNoteTodoMap(todoMap);
          setNewNote("<p></p>");
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

              <div className="space-y-2">
                <Label htmlFor="temperament">Customer Temperament</Label>
                <Select value={temperament} onValueChange={(value: "happy" | "satisfied" | "neutral" | "concerned" | "frustrated") => setTemperament(value)}>
                  <SelectTrigger id="temperament">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="happy">😊 Happy</SelectItem>
                    <SelectItem value="satisfied">🙂 Satisfied</SelectItem>
                    <SelectItem value="neutral">😐 Neutral</SelectItem>
                    <SelectItem value="concerned">😟 Concerned</SelectItem>
                    <SelectItem value="frustrated">😤 Frustrated</SelectItem>
                  </SelectContent>
                </Select>
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

              <div className="space-y-2">
                <Label htmlFor="patchFrequency">Patch Frequency</Label>
                <Select value={patchFrequency} onValueChange={(value: "monthly" | "quarterly") => setPatchFrequency(value)}>
                  <SelectTrigger id="patchFrequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mscUrl">MSC URL (Optional)</Label>
                <Input
                  id="mscUrl"
                  type="url"
                  placeholder="https://example.com/msc"
                  value={mscUrl}
                  onChange={(e) => setMscUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="runbookUrl">Runbook URL (Optional)</Label>
                <Input
                  id="runbookUrl"
                  type="url"
                  placeholder="https://example.com/runbook"
                  value={runbookUrl}
                  onChange={(e) => setRunbookUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="snowUrl">SNOW URL (Optional)</Label>
                <Input
                  id="snowUrl"
                  type="url"
                  placeholder="https://example.com/snow"
                  value={snowUrl}
                  onChange={(e) => setSnowUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Add Note Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Add Note (Optional)</h3>
            <div className="space-y-2">
              <Label htmlFor="newNote">New Note</Label>
              <RichTextEditor
                value={newNote}
                onChange={setNewNote}
                placeholder="Enter a note (optional)..."
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
                  {notes.map((note) => {
                    const todoId = noteTodoMap.get(note.id);
                    return (
                      <div
                        key={note.id}
                        className="bg-muted/50 p-4 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {formatDate(note.createdAt)}
                          </Badge>
                          {todoId ? (
                            <Link href={`/todos?highlight=${todoId}`}>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="View related to-do"
                              >
                                <CheckSquare className="h-4 w-4 text-green-600" />
                              </Button>
                            </Link>
                          ) : (
                            <AddTodoFromNoteDialog 
                              noteContent={note.note}
                              customerId={customer.id}
                              customerName={customer.name}
                              noteId={note.id}
                            />
                          )}
                        </div>
                        <div 
                          className="text-sm text-foreground prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline"
                          dangerouslySetInnerHTML={{ __html: note.note }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
