import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Video, Users, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JoinRoomFormProps {
  onJoin: (roomId: string, username: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function JoinRoomForm({ onJoin, isLoading, error }: JoinRoomFormProps) {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');

  const generateRoomId = () => {
    const id = 'room-' + Math.random().toString(36).substr(2, 9);
    setRoomId(id);
  };

  const generateUsername = () => {
    const adjectives = ['Happy', 'Clever', 'Swift', 'Bright', 'Calm'];
    const nouns = ['Panda', 'Eagle', 'Tiger', 'Dolphin', 'Fox'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    setUsername(`${adj}${noun}${num}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !username.trim()) return;
    await onJoin(roomId.trim(), username.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo and header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4 shadow-lg shadow-primary/25">
            <Video className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Video Call
          </h1>
          <p className="text-muted-foreground">
            Connect with anyone, anywhere
          </p>
        </div>

        {/* Form card */}
        <div className="glass-effect rounded-3xl p-8 border border-border shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Room ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Room ID
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="flex-1 bg-secondary/50 border-border focus:border-primary focus:ring-primary"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generateRoomId}
                  className="shrink-0 border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Your Name
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 bg-secondary/50 border-border focus:border-primary focus:ring-primary"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generateUsername}
                  className="shrink-0 border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading || !roomId.trim() || !username.trim()}
              className={cn(
                'w-full h-12 text-base font-semibold rounded-xl',
                'bg-gradient-to-r from-primary to-accent hover:opacity-90',
                'transition-all duration-200 shadow-lg shadow-primary/25'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Join Room
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Tips */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Share the Room ID with others to invite them to your call
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
