import { useState } from 'react';
import { X, BarChart2, Plus, Check, Vote, Presentation, Users, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Poll } from '@/lib/mediasoup';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  currentSocketId,
}: PollsPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());
  const [selectedVotes, setSelectedVotes] = useState<Map<string, number[]>>(new Map());
  const [presentingPollId, setPresentingPollId] = useState<string | null>(null);

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
      toast.success('Poll created and shared with all participants!');
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
      toast.success('Vote submitted!');
    }
  };

  const handlePresentPoll = (pollId: string) => {
    if (presentingPollId === pollId) {
      setPresentingPollId(null);
      toast.info('Stopped presenting poll');
    } else {
      setPresentingPollId(pollId);
      toast.success('Poll is now visible to everyone!');
    }
  };

  const activePolls = polls.filter(p => p.active);
  const closedPolls = polls.filter(p => !p.active);

  return (
    <div className="flex flex-col h-full glass-panel">
      <div className="flex items-center justify-between p-4 border-b border-border/30 glass-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-sm flex items-center justify-center border border-primary/20 shadow-inner">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Polls</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Shared with everyone
            </p>
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
              className="w-full rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
              data-testid="button-create-poll"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Poll
            </Button>
          ) : (
            <div className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 backdrop-blur-sm border border-border/30 shadow-inner">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Question</Label>
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="rounded-xl border-border/50 bg-background/50 backdrop-blur-sm focus:border-primary/50 focus:ring-primary/20"
                  data-testid="input-poll-question"
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
                      className="rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
                      data-testid={`input-poll-option-${index}`}
                    />
                    {options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                        className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
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
                    className="w-full rounded-xl border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/5"
                    data-testid="button-add-option"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                <Label className="text-sm">Anonymous voting</Label>
                <Switch
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                  data-testid="switch-anonymous"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                <Label className="text-sm">Allow multiple choices</Label>
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
                  className="flex-1 rounded-xl bg-gradient-to-r from-primary to-primary/80"
                  disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
                  data-testid="button-submit-poll"
                >
                  Create & Share
                </Button>
              </div>
            </div>
          )}

          {polls.length === 0 && !isCreating && (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Vote className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="font-medium mb-1">No polls yet</h3>
              <p className="text-sm text-muted-foreground">Create a poll to gather opinions from participants</p>
            </div>
          )}

          {/* Active Polls */}
          {activePolls.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Active Polls</h3>
              {activePolls.map((poll) => {
                const hasVoted = votedPolls.has(poll.id);
                const totalVotes = poll.totalVotes || 0;
                const currentSelection = selectedVotes.get(poll.id) || [];
                const isPresenting = presentingPollId === poll.id;

                return (
                  <div
                    key={poll.id}
                    className={cn(
                      "p-4 rounded-xl border backdrop-blur-sm transition-all",
                      isPresenting 
                        ? "border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/10" 
                        : "border-border/30 bg-gradient-to-br from-card/80 to-card/40"
                    )}
                    data-testid={`poll-${poll.id}`}
                  >
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium leading-snug">{poll.question}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <span>by {poll.creatorUsername}</span>
                          {poll.allowMultiple && (
                            <>
                              <span>•</span>
                              <span>Multiple choice</span>
                            </>
                          )}
                        </p>
                      </div>
                      <Button
                        variant={isPresenting ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePresentPoll(poll.id)}
                        className={cn(
                          "shrink-0 rounded-lg text-xs",
                          isPresenting && "bg-primary shadow-lg shadow-primary/30"
                        )}
                      >
                        {isPresenting ? (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            Presenting
                          </>
                        ) : (
                          <>
                            <Presentation className="w-3 h-3 mr-1" />
                            Present
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {poll.options.map((option, index) => {
                        const votes = poll.results?.[index] || 0;
                        const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                        const isSelected = currentSelection.includes(index);

                        return (
                          <div key={index} className="space-y-1">
                            {!hasVoted ? (
                              <button
                                onClick={() => handleVoteSelect(poll.id, index, poll.allowMultiple)}
                                className={cn(
                                  "w-full p-3 rounded-lg text-left transition-all",
                                  "border backdrop-blur-sm",
                                  isSelected
                                    ? "border-primary bg-primary/10 shadow-sm"
                                    : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
                                )}
                                data-testid={`vote-option-${poll.id}-${index}`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                    isSelected 
                                      ? "border-primary bg-primary scale-110" 
                                      : "border-muted-foreground/50"
                                  )}>
                                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                                  </div>
                                  <span className="text-sm">{option}</span>
                                </div>
                              </button>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">{option}</span>
                                  <span className="text-muted-foreground text-xs tabular-nums">
                                    {votes} ({percentage.toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="relative">
                                  <Progress value={percentage} className="h-2.5 rounded-full" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {!hasVoted && currentSelection.length > 0 && (
                      <Button
                        onClick={() => handleSubmitVote(poll.id)}
                        className="w-full mt-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
                        data-testid={`button-submit-vote-${poll.id}`}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Submit Vote
                      </Button>
                    )}

                    {hasVoted && (
                      <div className="mt-3 p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
                        <p className="text-sm text-primary flex items-center justify-center gap-1.5">
                          <Check className="w-4 h-4" />
                          Vote submitted
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onClosePoll(poll.id);
                          toast.success('Poll closed');
                        }}
                        className="h-6 text-xs hover:text-destructive hover:bg-destructive/10"
                        data-testid={`button-close-poll-${poll.id}`}
                      >
                        End Poll
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Closed Polls */}
          {closedPolls.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Closed Polls</h3>
              {closedPolls.map((poll) => {
                const totalVotes = poll.totalVotes || 0;

                return (
                  <div
                    key={poll.id}
                    className="p-4 rounded-xl border border-border/20 bg-muted/20 backdrop-blur-sm opacity-75"
                    data-testid={`poll-${poll.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{poll.question}</h3>
                        <p className="text-xs text-muted-foreground">by {poll.creatorUsername}</p>
                      </div>
                      <span className="text-xs bg-muted px-2 py-1 rounded-full">Closed</span>
                    </div>

                    <div className="space-y-2">
                      {poll.options.map((option, index) => {
                        const votes = poll.results?.[index] || 0;
                        const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{option}</span>
                              <span className="text-muted-foreground text-xs">{votes} ({percentage.toFixed(0)}%)</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground text-center">
                      Final: {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
