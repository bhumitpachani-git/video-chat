import { useState } from 'react';
import { X, BarChart2, Plus, Check, Vote } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Poll } from '@/lib/mediasoup';
import { cn } from '@/lib/utils';

interface PollsPanelProps {
  polls: Poll[];
  onCreatePoll: (question: string, options: string[], isAnonymous: boolean, allowMultiple: boolean) => void;
  onVote: (pollId: string, selectedOptions: number[]) => void;
  onClosePoll: (pollId: string) => void;
  onClose: () => void;
  currentSocketId?: string;
}

export function PollsPanel({ 
  polls, 
  onCreatePoll, 
  onVote, 
  onClosePoll, 
  onClose,
}: PollsPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());
  const [selectedVotes, setSelectedVotes] = useState<Map<string, number[]>>(new Map());

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

  const handleCreatePoll = () => {
    const validOptions = options.filter(o => o.trim() !== '');
    if (question.trim() && validOptions.length >= 2) {
      onCreatePoll(question.trim(), validOptions, isAnonymous, allowMultiple);
      setQuestion('');
      setOptions(['', '']);
      setIsAnonymous(false);
      setAllowMultiple(false);
      setIsCreating(false);
    }
  };

  const handleVoteSelect = (pollId: string, optionIndex: number, allowMultiple: boolean) => {
    const current = selectedVotes.get(pollId) || [];
    let newSelection: number[];
    
    if (allowMultiple) {
      if (current.includes(optionIndex)) {
        newSelection = current.filter(i => i !== optionIndex);
      } else {
        newSelection = [...current, optionIndex];
      }
    } else {
      newSelection = [optionIndex];
    }
    
    setSelectedVotes(new Map(selectedVotes.set(pollId, newSelection)));
  };

  const handleSubmitVote = (pollId: string) => {
    const selection = selectedVotes.get(pollId);
    if (selection && selection.length > 0) {
      onVote(pollId, selection);
      setVotedPolls(new Set(votedPolls.add(pollId)));
    }
  };

  return (
    <div className="flex flex-col h-full glass-panel">
      <div className="flex items-center justify-between p-4 border-b border-border/30 glass-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/20">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Polls</h2>
            <p className="text-xs text-muted-foreground">Create and vote on polls</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors backdrop-blur-sm"
          data-testid="button-close-polls"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {!isCreating ? (
            <Button
              onClick={() => setIsCreating(true)}
              className="w-full rounded-xl"
              data-testid="button-create-poll"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Poll
            </Button>
          ) : (
            <div className="space-y-4 p-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/30">
              <div className="space-y-2">
                <Label>Question</Label>
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="rounded-xl"
                  data-testid="input-poll-question"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Options</Label>
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="rounded-xl"
                      data-testid={`input-poll-option-${index}`}
                    />
                    {options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                        className="shrink-0"
                        data-testid={`button-remove-option-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                    className="w-full rounded-xl"
                    data-testid="button-add-option"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label>Anonymous voting</Label>
                <Switch
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                  data-testid="switch-anonymous"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Allow multiple choices</Label>
                <Switch
                  checked={allowMultiple}
                  onCheckedChange={setAllowMultiple}
                  data-testid="switch-multiple"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 rounded-xl"
                  data-testid="button-cancel-poll"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePoll}
                  className="flex-1 rounded-xl"
                  disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
                  data-testid="button-submit-poll"
                >
                  Create
                </Button>
              </div>
            </div>
          )}

          {polls.length === 0 && !isCreating && (
            <div className="text-center py-8 text-muted-foreground">
              <Vote className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No polls yet</p>
              <p className="text-sm">Create one to get started</p>
            </div>
          )}

          {polls.map((poll) => {
            const hasVoted = votedPolls.has(poll.id);
            const totalVotes = poll.totalVotes || 0;
            const currentSelection = selectedVotes.get(poll.id) || [];

            return (
              <div
                key={poll.id}
                className={cn(
                  "p-4 rounded-xl border border-border/30 backdrop-blur-sm",
                  !poll.active && "opacity-60"
                )}
                data-testid={`poll-${poll.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{poll.question}</h3>
                    <p className="text-xs text-muted-foreground">
                      by {poll.creatorUsername} {poll.allowMultiple && "• Multiple choice"}
                    </p>
                  </div>
                  {!poll.active && (
                    <span className="text-xs bg-muted px-2 py-1 rounded-full">Closed</span>
                  )}
                </div>

                <div className="space-y-2">
                  {poll.options.map((option, index) => {
                    const votes = poll.results?.[index] || 0;
                    const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                    const isSelected = currentSelection.includes(index);

                    return (
                      <div key={index} className="space-y-1">
                        {poll.active && !hasVoted ? (
                          <button
                            onClick={() => handleVoteSelect(poll.id, index, poll.allowMultiple)}
                            className={cn(
                              "w-full p-3 rounded-lg text-left transition-colors",
                              "border",
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border/50 hover:border-primary/50"
                            )}
                            data-testid={`vote-option-${poll.id}-${index}`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                              )}>
                                {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                              </div>
                              <span>{option}</span>
                            </div>
                          </button>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{option}</span>
                              <span className="text-muted-foreground">{votes} votes ({percentage.toFixed(0)}%)</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {poll.active && !hasVoted && currentSelection.length > 0 && (
                  <Button
                    onClick={() => handleSubmitVote(poll.id)}
                    className="w-full mt-3 rounded-xl"
                    data-testid={`button-submit-vote-${poll.id}`}
                  >
                    Submit Vote
                  </Button>
                )}

                {hasVoted && poll.active && (
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    You have voted
                  </p>
                )}

                <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                  <span>{totalVotes} total votes</span>
                  {poll.active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onClosePoll(poll.id)}
                      className="h-6 text-xs"
                      data-testid={`button-close-poll-${poll.id}`}
                    >
                      Close Poll
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
