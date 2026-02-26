"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useCallback, useEffect, useRef } from "react";
import { Link2, Unlink } from "lucide-react";
import { toast } from "sonner";

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      reject(new Error("Image must be under 2MB"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [hasSelection, setHasSelection] = useState(false);
  const [isLinkActive, setIsLinkActive] = useState(false);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: "rounded-md max-w-full h-auto" },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3 border rounded-md bg-background text-foreground",
      },
      handleDrop(view, event, slice, moved) {
        if (moved) return false;
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const file = files[0];
        if (!IMAGE_TYPES.has(file.type)) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (pos == null) return false;
        fileToDataUrl(file)
          .then((src) => {
            const ed = editorRef.current;
            if (ed) ed.chain().focus().setTextSelection(pos.pos).insertContent([{ type: "image", attrs: { src } }]).run();
          })
          .catch(() => toast.error("Image must be under 2MB"));
        return true;
      },
      handlePaste(view, event) {
        const files = event.clipboardData?.files;
        if (!files?.length) return false;
        const file = files[0];
        if (!IMAGE_TYPES.has(file.type)) return false;
        event.preventDefault();
        fileToDataUrl(file)
          .then((src) => {
            const ed = editorRef.current;
            if (ed) ed.chain().focus().insertContent([{ type: "image", attrs: { src } }]).run();
          })
          .catch(() => toast.error("Image must be under 2MB"));
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      setHasSelection(!editor.state.selection.empty);
      setIsLinkActive(editor.isActive("link"));
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      setHasSelection(!editor.state.selection.empty);
      setIsLinkActive(editor.isActive("link"));
    }
  }, [editor]);

  const openLinkDialog = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setIsLinkDialogOpen(true);
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
    }

    setIsLinkDialogOpen(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex gap-1 border rounded-md p-1 bg-muted/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={openLinkDialog}
          disabled={!hasSelection && !isLinkActive}
          className={isLinkActive ? "bg-muted" : ""}
          title="Add or edit link"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        
        {isLinkActive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeLink}
            title="Remove link"
          >
            <Unlink className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>
              Enter the URL for the selected text
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="linkUrl">URL</Label>
            <Input
              id="linkUrl"
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setLink();
                }
              }}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLinkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={setLink}>
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
