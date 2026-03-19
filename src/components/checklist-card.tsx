"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  reorderChecklistItems,
  toggleChecklistItem,
  updateChecklist,
  updateChecklistItem,
} from "@/app/actions/checklists";
import { toast } from "sonner";
import { GripVertical, Pencil, Trash2 } from "lucide-react";

export type ChecklistItemDTO = {
  id: number;
  text: string;
  completed: boolean;
  sortOrder: number;
};

export type ChecklistCardProps = {
  checklist: {
    id: number;
    title: string;
    items: ChecklistItemDTO[];
  };
};

function SortableChecklistRow({
  item,
  disabled,
  completedLook,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: ChecklistItemDTO;
  disabled: boolean;
  completedLook: boolean;
  onToggle: (id: number) => void;
  onEdit: (item: ChecklistItemDTO) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 group rounded-md ${completedLook ? "opacity-70" : ""}`}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground mt-0.5 cursor-grab active:cursor-grabbing touch-none shrink-0 rounded p-1 disabled:opacity-40 disabled:pointer-events-none"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Checkbox
        checked={item.completed}
        onCheckedChange={() => onToggle(item.id)}
        disabled={disabled}
        className="mt-1.5"
      />
      <span
        className={`flex-1 text-sm pt-0.5 ${completedLook ? "line-through text-muted-foreground" : ""}`}
      >
        {item.text}
      </span>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(item)}
          disabled={disabled}
          aria-label="Edit item"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onDelete(item.id)}
          disabled={disabled}
          aria-label="Remove item"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    </li>
  );
}

function persistOrder(
  checklistId: number,
  incomplete: ChecklistItemDTO[],
  complete: ChecklistItemDTO[],
  startTransition: (fn: () => void | Promise<void>) => void
) {
  const orderedItemIds = [...incomplete, ...complete].map((i) => i.id);
  startTransition(async () => {
    try {
      await reorderChecklistItems({ checklistId, orderedItemIds });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder");
    }
  });
}

export function ChecklistCard({ checklist }: ChecklistCardProps) {
  const [isPending, startTransition] = useTransition();
  const [newItemText, setNewItemText] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState(checklist.title);
  const [deleteChecklistOpen, setDeleteChecklistOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItemDTO | null>(null);
  const [editItemText, setEditItemText] = useState("");

  const [localIncomplete, setLocalIncomplete] = useState<ChecklistItemDTO[]>(() =>
    checklist.items.filter((i) => !i.completed)
  );
  const [localComplete, setLocalComplete] = useState<ChecklistItemDTO[]>(() =>
    checklist.items.filter((i) => i.completed)
  );

  const serverFingerprint = checklist.items
    .map((i) => `${i.id}:${i.sortOrder}:${i.completed ? 1 : 0}:${i.text}`)
    .join("|");

  useEffect(() => {
    setLocalIncomplete(checklist.items.filter((i) => !i.completed));
    setLocalComplete(checklist.items.filter((i) => i.completed));
  }, [serverFingerprint]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeId = active.id as number;
      const overId = over.id as number;

      const incOld = localIncomplete;
      const compOld = localComplete;
      const activeInc = incOld.findIndex((i) => i.id === activeId);
      const overInc = incOld.findIndex((i) => i.id === overId);
      const activeComp = compOld.findIndex((i) => i.id === activeId);
      const overComp = compOld.findIndex((i) => i.id === overId);

      if (activeInc >= 0 && overInc >= 0) {
        const next = arrayMove(incOld, activeInc, overInc);
        setLocalIncomplete(next);
        persistOrder(checklist.id, next, compOld, startTransition);
        return;
      }

      if (activeComp >= 0 && overComp >= 0) {
        const next = arrayMove(compOld, activeComp, overComp);
        setLocalComplete(next);
        persistOrder(checklist.id, incOld, next, startTransition);
      }
    },
    [checklist.id, localIncomplete, localComplete, startTransition]
  );

  const openEditItem = (item: ChecklistItemDTO) => {
    setEditingItem(item);
    setEditItemText(item.text);
    setEditItemOpen(true);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = renameTitle.trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }
    startTransition(async () => {
      try {
        await updateChecklist({ id: checklist.id, title });
        toast.success("Checklist updated");
        setRenameOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    });
  };

  const handleDeleteChecklist = () => {
    startTransition(async () => {
      try {
        await deleteChecklist({ id: checklist.id });
        toast.success("Checklist deleted");
        setDeleteChecklistOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newItemText.trim();
    if (!text) return;
    startTransition(async () => {
      try {
        await addChecklistItem({ checklistId: checklist.id, text });
        setNewItemText("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add item");
      }
    });
  };

  const handleToggleItem = (itemId: number) => {
    startTransition(async () => {
      try {
        await toggleChecklistItem({ id: itemId });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update item");
      }
    });
  };

  const handleDeleteItem = (itemId: number) => {
    startTransition(async () => {
      try {
        await deleteChecklistItem({ id: itemId });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to remove item");
      }
    });
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const text = editItemText.trim();
    if (!text) {
      toast.error("Item text is required");
      return;
    }
    startTransition(async () => {
      try {
        await updateChecklistItem({ id: editingItem.id, text });
        toast.success("Item updated");
        setEditItemOpen(false);
        setEditingItem(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update item");
      }
    });
  };

  const incompleteIds = localIncomplete.map((i) => i.id);
  const completeIds = localComplete.map((i) => i.id);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold leading-tight truncate">{checklist.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {checklist.items.length === 0
                ? "No items yet"
                : `${localComplete.length} of ${checklist.items.length} done`}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setRenameTitle(checklist.title);
                setRenameOpen(true);
              }}
              disabled={isPending}
              aria-label="Rename checklist"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDeleteChecklistOpen(true)}
              disabled={isPending}
              aria-label="Delete checklist"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {localIncomplete.length > 0 && (
              <SortableContext items={incompleteIds} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {localIncomplete.map((item) => (
                    <SortableChecklistRow
                      key={item.id}
                      item={item}
                      disabled={isPending}
                      completedLook={false}
                      onToggle={handleToggleItem}
                      onEdit={openEditItem}
                      onDelete={handleDeleteItem}
                    />
                  ))}
                </ul>
              </SortableContext>
            )}

            {localComplete.length > 0 && (
              <div>
                {localIncomplete.length > 0 && <hr className="border-border mb-3" />}
                <p className="text-xs font-medium text-muted-foreground mb-2">Completed</p>
                <SortableContext items={completeIds} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    {localComplete.map((item) => (
                      <SortableChecklistRow
                        key={item.id}
                        item={item}
                        disabled={isPending}
                        completedLook
                        onToggle={handleToggleItem}
                        onEdit={openEditItem}
                        onDelete={handleDeleteItem}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </div>
            )}
          </DndContext>

          {checklist.items.length > 0 && (
            <p className="text-xs text-muted-foreground -mt-2">
              Drag the grip handle to reorder items within each section (active vs completed).
            </p>
          )}

          <form onSubmit={handleAddItem} className="flex gap-2 pt-1">
            <Input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Add an item…"
              maxLength={2000}
              disabled={isPending}
              className="flex-1"
            />
            <Button type="submit" disabled={isPending || !newItemText.trim()}>
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <form onSubmit={handleRenameSubmit}>
            <DialogHeader>
              <DialogTitle>Rename checklist</DialogTitle>
              <DialogDescription>Update the title shown at the top of this list.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <Label htmlFor={`rename-${checklist.id}`}>Title</Label>
              <Input
                id={`rename-${checklist.id}`}
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                maxLength={255}
                disabled={isPending}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenameOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteChecklistOpen} onOpenChange={setDeleteChecklistOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete checklist?</DialogTitle>
            <DialogDescription>
              This removes “{checklist.title}” and all of its items. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteChecklistOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteChecklist} disabled={isPending}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editItemOpen}
        onOpenChange={(open) => {
          setEditItemOpen(open);
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent>
          <form onSubmit={handleSaveItem}>
            <DialogHeader>
              <DialogTitle>Edit item</DialogTitle>
              <DialogDescription>Change the text for this checklist line.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <Label htmlFor={`item-${editingItem?.id}`}>Text</Label>
              <Input
                id={`item-${editingItem?.id}`}
                value={editItemText}
                onChange={(e) => setEditItemText(e.target.value)}
                maxLength={2000}
                disabled={isPending}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditItemOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
