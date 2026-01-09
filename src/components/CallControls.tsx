import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Check, Monitor, MonitorOff, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CallControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  roomId: string;
  hasUnreadMessages?: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onLeaveCall: () => void;
}

export function CallControls({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  roomId,
  hasUnreadMessages,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onToggleChat,
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
      <div className="glass-effect rounded-2xl px-4 md:px-6 py-3 md:py-4 flex items-center gap-2 md:gap-4 shadow-2xl border border-border">
        {/* Room ID */}
        <button
          onClick={copyRoomId}
          className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
        >
          <span className="text-sm text-muted-foreground">Room:</span>
          <span className="text-sm font-mono font-medium text-foreground">{roomId}</span>
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <div className="w-px h-8 bg-border hidden lg:block" />

        {/* Audio toggle */}
        <Button
          variant="ghost"
          size="lg"
          onClick={onToggleAudio}
          className={cn(
            'rounded-full w-12 h-12 md:w-14 md:h-14 p-0 transition-all duration-200',
            isAudioEnabled 
              ? 'bg-control hover:bg-control-hover text-foreground' 
              : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
          )}
        >
          {isAudioEnabled ? (
            <Mic className="w-5 h-5 md:w-6 md:h-6" />
          ) : (
            <MicOff className="w-5 h-5 md:w-6 md:h-6" />
          )}
        </Button>

        {/* Video toggle */}
        <Button
          variant="ghost"
          size="lg"
          onClick={onToggleVideo}
          className={cn(
            'rounded-full w-12 h-12 md:w-14 md:h-14 p-0 transition-all duration-200',
            isVideoEnabled 
              ? 'bg-control hover:bg-control-hover text-foreground' 
              : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
          )}
        >
          {isVideoEnabled ? (
            <Video className="w-5 h-5 md:w-6 md:h-6" />
          ) : (
            <VideoOff className="w-5 h-5 md:w-6 md:h-6" />
          )}
        </Button>

        {/* Screen share toggle */}
        <Button
          variant="ghost"
          size="lg"
          onClick={onToggleScreenShare}
          className={cn(
            'rounded-full w-12 h-12 md:w-14 md:h-14 p-0 transition-all duration-200',
            isScreenSharing 
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
              : 'bg-control hover:bg-control-hover text-foreground'
          )}
        >
          {isScreenSharing ? (
            <MonitorOff className="w-5 h-5 md:w-6 md:h-6" />
          ) : (
            <Monitor className="w-5 h-5 md:w-6 md:h-6" />
          )}
        </Button>

        {/* Chat toggle */}
        <Button
          variant="ghost"
          size="lg"
          onClick={onToggleChat}
          className={cn(
            'rounded-full w-12 h-12 md:w-14 md:h-14 p-0 transition-all duration-200 relative',
            'bg-control hover:bg-control-hover text-foreground'
          )}
        >
          <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
          {hasUnreadMessages && (
            <span className="absolute top-1 right-1 w-3 h-3 bg-primary rounded-full" />
          )}
        </Button>

        <div className="w-px h-8 bg-border" />

        {/* Leave call */}
        <Button
          variant="destructive"
          size="lg"
          onClick={onLeaveCall}
          className="rounded-full w-12 h-12 md:w-14 md:h-14 p-0 bg-destructive hover:bg-destructive/90"
        >
          <PhoneOff className="w-5 h-5 md:w-6 md:h-6" />
        </Button>
      </div>
    </div>
  );
}
