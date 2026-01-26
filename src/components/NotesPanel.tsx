import { useState, useEffect, useCallback } from 'react';
import { X, FileText, Save, Users, Clock, Presentation, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NotesPanelProps {
  notes: string;
  onUpdateNotes: (notes: string) => void;
  onClose: () => void;
}

export function NotesPanel({ notes, onUpdateNotes, onClose }: NotesPanelProps) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [hasChanges, setHasChanges] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalNotes(notes);
    setHasChanges(false);
  }, [notes]);

  const handleChange = (value: string) => {
    setLocalNotes(value);
    setHasChanges(value !== notes);
  };

  const handleSave = useCallback(() => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    onUpdateNotes(localNotes);
    setHasChanges(false);
    setLastSaved(new Date());
    
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Notes saved and synced with all participants');
    }, 300);
  }, [localNotes, onUpdateNotes, hasChanges]);

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!hasChanges) return;
    
    const timer = setTimeout(() => {
      handleSave();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [localNotes, hasChanges, handleSave]);

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

  const handlePresent = () => {
    setIsPresenting(!isPresenting);
    if (!isPresenting) {
      toast.success('Notes are now visible to everyone!');
    } else {
      toast.info('Stopped presenting notes');
    }
  };

  const wordCount = localNotes.trim() ? localNotes.trim().split(/\s+/).length : 0;
  const charCount = localNotes.length;

  return (
    <div className="flex flex-col h-full glass-panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30 glass-header">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl backdrop-blur-sm flex items-center justify-center border shadow-inner transition-all",
            isPresenting 
              ? "bg-gradient-to-br from-primary/40 to-primary/20 border-primary/30" 
              : "bg-gradient-to-br from-primary/20 to-primary/10 border-primary/20"
          )}>
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Shared Notes</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              {isPresenting ? 'Presenting to everyone' : 'Collaborate in real-time'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={isPresenting ? "default" : "outline"}
            size="sm"
            onClick={handlePresent}
            className={cn(
              "rounded-xl text-xs",
              isPresenting && "bg-primary shadow-lg shadow-primary/30"
            )}
          >
            <Presentation className="w-3.5 h-3.5 mr-1.5" />
            {isPresenting ? 'Presenting' : 'Present'}
          </Button>
          {hasChanges && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
              data-testid="button-save-notes"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 mr-1.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
            data-testid="button-close-notes"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className={cn(
        "flex-1 p-4 flex flex-col relative",
        isPresenting && "ring-2 ring-primary ring-inset rounded-lg m-2"
      )}>
        {isPresenting && (
          <div className="absolute top-0 left-0 z-10 flex items-center gap-1.5 px-2 py-1 rounded-br-lg bg-primary text-primary-foreground text-xs font-medium">
            <Presentation className="w-3 h-3" />
            Live
          </div>
        )}
        
        <Textarea
          value={localNotes}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Start typing your meeting notes here...

Ideas you can capture:
• Action items and decisions
• Key discussion points  
• Questions and answers
• Next steps and follow-ups

All participants can see and edit these notes in real-time."
          className={cn(
            "flex-1 resize-none rounded-xl border-border/50 bg-background/50 backdrop-blur-sm min-h-[300px] text-sm leading-relaxed",
            "focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
            "placeholder:text-muted-foreground/60"
          )}
          data-testid="textarea-notes"
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/30 bg-gradient-to-t from-muted/20 to-transparent">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            <span>•</span>
            <span>{charCount} {charCount === 1 ? 'character' : 'characters'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {hasChanges ? (
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
              <span className="flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                Synced with all
              </span>
            )}
          </div>
        </div>
        
        <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
          Auto-saves after 2 seconds • Press Ctrl/Cmd+S to save immediately
        </p>
      </div>
    </div>
  );
}
