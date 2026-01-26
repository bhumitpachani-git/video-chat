import { useState } from 'react';
import { Plus, X, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface CreatePollModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePoll: (question: string, options: string[], isAnonymous: boolean, allowMultiple: boolean) => void;
}

export function CreatePollModal({ open, onOpenChange, onCreatePoll }: CreatePollModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreate = () => {
    const validOptions = options.filter(o => o.trim() !== '');
    if (question.trim() && validOptions.length >= 2) {
      onCreatePoll(question.trim(), validOptions, isAnonymous, allowMultiple);
      // Reset form
      setQuestion('');
      setOptions(['', '']);
      setIsAnonymous(false);
      setAllowMultiple(false);
      onOpenChange(false);
      toast.success('Poll created and shared with all participants!');
    }
  };

  const isValid = question.trim() && options.filter(o => o.trim()).length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <BarChart2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Create a Poll</DialogTitle>
              <DialogDescription>Ask a question to all participants</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Question</Label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
              className="rounded-xl border-border/50 bg-background/50"
              data-testid="input-create-poll-question"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Options</Label>
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="rounded-xl border-border/50 bg-background/50"
                  data-testid={`input-create-poll-option-${index}`}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(index)}
                    className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="w-full rounded-xl border-dashed"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <Label className="text-sm">Anonymous voting</Label>
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <Label className="text-sm">Allow multiple choices</Label>
              <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!isValid}
            className="flex-1 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
            data-testid="button-create-poll-submit"
          >
            Create & Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
