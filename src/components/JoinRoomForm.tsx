import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Video, Users, Sparkles, ArrowRight, Loader2, Shield, Globe, Mic } from 'lucide-react';
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
    const adjectives = ['Happy', 'Clever', 'Swift', 'Bright', 'Calm', 'Bold', 'Wise', 'Cool'];
    const nouns = ['Panda', 'Eagle', 'Tiger', 'Dolphin', 'Fox', 'Wolf', 'Bear', 'Hawk'];
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

  const features = [
    { icon: Video, label: 'HD Video' },
    { icon: Mic, label: 'Crystal Audio' },
    { icon: Globe, label: 'Live Translation' },
    { icon: Shield, label: 'Secure' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      {/* Grid pattern overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none" />

      <div className="relative w-full max-w-lg z-10">
        {/* Logo and header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary via-primary to-accent mb-6 shadow-2xl shadow-primary/30 relative">
            <Video className="w-12 h-12 text-primary-foreground" />
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">
            Video Call
          </h1>
          <p className="text-lg text-muted-foreground">
            Connect with anyone, anywhere in real-time
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {features.map((feature, i) => (
            <div 
              key={i}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 backdrop-blur-sm"
            >
              <feature.icon className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground font-medium">{feature.label}</span>
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="backdrop-blur-2xl bg-card/60 rounded-3xl p-8 md:p-10 border border-border/50 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Room ID */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-primary" />
                </div>
                Room ID
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter or generate room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="flex-1 h-12 rounded-xl bg-background/80 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-base"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generateRoomId}
                  className="shrink-0 h-12 w-12 rounded-xl border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-primary" />
                </div>
                Your Name
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter your display name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 h-12 rounded-xl bg-background/80 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-base"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generateUsername}
                  className="shrink-0 h-12 w-12 rounded-xl border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading || !roomId.trim() || !username.trim()}
              className={cn(
                'w-full h-14 text-lg font-semibold rounded-xl',
                'bg-gradient-to-r from-primary to-accent hover:opacity-90',
                'transition-all duration-300 shadow-xl shadow-primary/30',
                'disabled:opacity-50 disabled:cursor-not-allowed'
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
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-sm text-muted-foreground text-center">
              Share the Room ID with others to invite them to your call
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          End-to-end encrypted • No sign up required
        </p>
      </div>
    </div>
  );
}
