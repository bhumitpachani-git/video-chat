import { useState, useEffect } from 'react';
import { Check, Vote, Users, X, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Poll } from '@/lib/mediasoup';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface PollModalProps {
  poll: Poll | null;
  onVote: (pollId: string, selectedOptions: number[]) => void;
  onClose: () => void;
  hasVoted: boolean;
}

export function PollModal({ poll, onVote, onClose, hasVoted }: PollModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(hasVoted);

  useEffect(() => {
    setShowResults(hasVoted);
    if (!hasVoted) {
      setSelectedOptions([]);
    }
  }, [poll?.id, hasVoted]);

  if (!poll) return null;

  const totalVotes = poll.totalVotes || 0;

  const handleOptionSelect = (index: number) => {
    if (poll.allowMultiple) {
      setSelectedOptions(prev =>
        prev.includes(index)
          ? prev.filter(i => i !== index)
          : [...prev, index]
      );
    } else {
      setSelectedOptions([index]);
    }
  };

  const handleSubmitVote = () => {
    if (selectedOptions.length > 0) {
      onVote(poll.id, selectedOptions);
      setShowResults(true);
    }
  };

  return (
    <Dialog open={!!poll && poll.active} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <BarChart2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{poll.question}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <span>by {poll.creatorUsername}</span>
                {poll.allowMultiple && (
                  <>
                    <span>•</span>
                    <span>Multiple choice</span>
                  </>
                )}
                {poll.isAnonymous && (
                  <>
                    <span>•</span>
                    <span>Anonymous</span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {poll.options.map((option, index) => {
            const votes = poll.results?.[index] || 0;
            const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
            const isSelected = selectedOptions.includes(index);

            return (
              <div key={index} className="space-y-1">
                {!showResults ? (
                  <button
                    onClick={() => handleOptionSelect(index)}
                    className={cn(
                      "w-full p-4 rounded-xl text-left transition-all",
                      "border-2 backdrop-blur-sm",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    )}
                    data-testid={`poll-option-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                          isSelected
                            ? "border-primary bg-primary scale-110"
                            : "border-muted-foreground/50"
                        )}
                      >
                        {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                      </div>
                      <span className="font-medium">{option}</span>
                    </div>
                  </button>
                ) : (
                  <div className="space-y-2 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{option}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {votes} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-3 rounded-full" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </span>
          </div>

          <div className="flex gap-2">
            {!showResults && selectedOptions.length > 0 && (
              <Button
                onClick={handleSubmitVote}
                className="rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
                data-testid="button-submit-poll-vote"
              >
                <Check className="w-4 h-4 mr-2" />
                Submit Vote
              </Button>
            )}
            {showResults && (
              <Button
                variant="outline"
                onClick={onClose}
                className="rounded-xl"
                data-testid="button-close-poll-modal"
              >
                Close
              </Button>
            )}
          </div>
        </div>

        {showResults && (
          <div className="mt-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
            <p className="text-sm text-primary flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              Your vote has been recorded
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
