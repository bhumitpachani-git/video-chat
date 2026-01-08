import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CallControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  roomId: string;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onLeaveCall: () => void;
}

export function CallControls({
  isVideoEnabled,
  isAudioEnabled,
  roomId,
  onToggleVideo,
  onToggleAudio,
  onLeaveCall,
}: CallControlsProps) {
  const [copied, setCopied] = useState(false);

  const copyRoomId = async () => {
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    toast.success('Room ID copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-center items-center z-50">
      <div className="glass-effect rounded-2xl px-6 py-4 flex items-center gap-4 shadow-2xl border border-border">
        {/* Room ID */}
        <button
          onClick={copyRoomId}
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
        >
          <span className="text-sm text-muted-foreground">Room:</span>
          <span className="text-sm font-mono font-medium text-foreground">{roomId}</span>
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <div className="w-px h-8 bg-border hidden md:block" />

        {/* Audio toggle */}
        <Button
          variant="ghost"
          size="lg"
          onClick={onToggleAudio}
          className={cn(
            'rounded-full w-14 h-14 p-0 transition-all duration-200',
            isAudioEnabled 
              ? 'bg-control hover:bg-control-hover text-foreground' 
              : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
          )}
        >
          {isAudioEnabled ? (
            <Mic className="w-6 h-6" />
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </Button>

        {/* Video toggle */}
        <Button
          variant="ghost"
          size="lg"
          onClick={onToggleVideo}
          className={cn(
            'rounded-full w-14 h-14 p-0 transition-all duration-200',
            isVideoEnabled 
              ? 'bg-control hover:bg-control-hover text-foreground' 
              : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
          )}
        >
          {isVideoEnabled ? (
            <Video className="w-6 h-6" />
          ) : (
            <VideoOff className="w-6 h-6" />
          )}
        </Button>

        <div className="w-px h-8 bg-border" />

        {/* Leave call */}
        <Button
          variant="destructive"
          size="lg"
          onClick={onLeaveCall}
          className="rounded-full w-14 h-14 p-0 bg-destructive hover:bg-destructive/90"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
