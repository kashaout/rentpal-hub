import { useState } from "react";
import { StickyNote, Pencil, Check, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface NotesSectionProps {
  notes: string | null;
  onSave: (notes: string) => Promise<void>;
  readOnly?: boolean;
}

export function NotesSection({ notes, onSave, readOnly }: NotesSectionProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(value);
    setSaving(false);
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <StickyNote className="h-4 w-4" />
            Notes
          </CardTitle>
          {!readOnly && !editing && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => { setValue(notes || ""); setEditing(true); }}>
              <Pencil className="h-3 w-3" /> Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Add notes about this item..."
              className="min-h-[80px] text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {notes || "No notes yet. Click Edit to add notes."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
