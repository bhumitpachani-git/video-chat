import { useState, useEffect, useCallback } from 'react';
import { X, FileText, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface NotesPanelProps {
  notes: string;
  onUpdateNotes: (notes: string) => void;
  onClose: () => void;
}

export function NotesPanel({ notes, onUpdateNotes, onClose }: NotesPanelProps) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLocalNotes(notes);
    setHasChanges(false);
  }, [notes]);

  const handleChange = (value: string) => {
    setLocalNotes(value);
    setHasChanges(value !== notes);
  };

  const handleSave = useCallback(() => {
    onUpdateNotes(localNotes);
    setHasChanges(false);
    toast({
      title: "Notes saved",
      description: "Your notes have been synced with all participants",
    });
  }, [localNotes, onUpdateNotes, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, handleSave]);

  return (
    <div className="flex flex-col h-full glass-panel">
      <div className="flex items-center justify-between p-4 border-b border-border/30 glass-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/20">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Shared Notes</h2>
            <p className="text-xs text-muted-foreground">Collaborate in real-time</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              size="sm"
              onClick={handleSave}
              className="rounded-xl"
              data-testid="button-save-notes"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors backdrop-blur-sm"
            data-testid="button-close-notes"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col">
        <Textarea
          value={localNotes}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Start typing your notes here... All participants can see and edit these notes in real-time."
          className="flex-1 resize-none rounded-xl border-border/50 bg-background/50 backdrop-blur-sm min-h-[200px]"
          data-testid="textarea-notes"
        />
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {hasChanges ? (
            <span className="text-amber-500">Unsaved changes - Press Ctrl/Cmd+S to save</span>
          ) : (
            <span>Notes are synced with all participants</span>
          )}
        </p>
      </div>
    </div>
  );
}
