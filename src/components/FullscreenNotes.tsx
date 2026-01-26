import { useState, useEffect, useCallback } from 'react';
import { X, FileText, Save, Users, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FullscreenNotesProps {
  notes: string;
  presenterName: string;
  isPresenter: boolean;
  onUpdateNotes?: (notes: string) => void;
  onClose: () => void;
}

export function FullscreenNotes({
  notes,
  presenterName,
  isPresenter,
  onUpdateNotes,
  onClose,
}: FullscreenNotesProps) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalNotes(notes);
    setHasChanges(false);
  }, [notes]);

  const handleChange = (value: string) => {
    if (!isPresenter) return;
    setLocalNotes(value);
    setHasChanges(value !== notes);
  };

  const handleSave = useCallback(() => {
    if (!hasChanges || !isPresenter) return;

    setIsSaving(true);
    onUpdateNotes?.(localNotes);
    setHasChanges(false);
    setLastSaved(new Date());

    setTimeout(() => {
      setIsSaving(false);
      toast.success('Notes saved and synced with all participants');
    }, 300);
  }, [localNotes, onUpdateNotes, hasChanges, isPresenter]);

  // Auto-save after 2 seconds
  useEffect(() => {
    if (!hasChanges || !isPresenter) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => clearTimeout(timer);
  }, [localNotes, hasChanges, handleSave, isPresenter]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && isPresenter) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, handleSave, isPresenter]);

  const wordCount = localNotes.trim() ? localNotes.trim().split(/\s+/).length : 0;
  const charCount = localNotes.length;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Shared Notes</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Presented by {presenterName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPresenter && hasChanges && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-gradient-to-r from-primary to-primary/80"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Notes content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {isPresenter ? (
            <Textarea
              value={localNotes}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Start typing your meeting notes here...

Ideas you can capture:
• Action items and decisions
• Key discussion points  
• Questions and answers
• Next steps and follow-ups

All participants can see these notes in real-time."
              className={cn(
                "min-h-[500px] resize-none rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm",
                "text-base leading-relaxed p-6",
                "focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                "placeholder:text-muted-foreground/60"
              )}
            />
          ) : (
            <div className="min-h-[500px] p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {localNotes || (
                  <p className="text-muted-foreground italic">No notes yet...</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{charCount} characters</span>
          </div>

          <div className="flex items-center gap-2">
            {isPresenter ? (
              hasChanges ? (
                <span className="flex items-center gap-1.5 text-destructive">
                  <Clock className="w-3 h-3" />
                  Unsaved changes
                </span>
              ) : lastSaved ? (
                <span className="flex items-center gap-1.5 text-primary">
                  <CheckCircle className="w-3 h-3" />
                  Saved
                </span>
              ) : (
                <span>You are presenting</span>
              )
            ) : (
              <span>View only mode</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
