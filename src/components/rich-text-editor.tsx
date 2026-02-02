"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useCallback, useEffect } from "react";
import { Link2, Unlink } from "lucide-react";

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
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3 border rounded-md bg-background text-foreground",
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
