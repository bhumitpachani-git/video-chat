import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Check, 
  Monitor, MonitorOff, MessageCircle, Languages, Circle, Square,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CallControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  isTranscribing: boolean;
  isRecording: boolean;
  roomId: string;
  hasUnreadMessages?: boolean;
  isChatOpen?: boolean;
  isTranscriptionOpen?: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleTranscription: () => void;
  onToggleRecording: () => void;
  onLeaveCall: () => void;
}

export function CallControls({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  isTranscribing,
  isRecording,
  roomId,
  hasUnreadMessages,
  isChatOpen,
  isTranscriptionOpen,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onToggleChat,
  onToggleTranscription,
  onToggleRecording,
  onLeaveCall,
}: CallControlsProps) {
  const [copied, setCopied] = useState(false);

  const copyRoomId = async () => {
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    toast.success('Room ID copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const ControlButton = ({ 
    onClick, 
    isActive, 
    isDestructive = false,
    isPrimary = false,
    children,
    badge,
    className,
  }: { 
    onClick: () => void; 
    isActive?: boolean;
    isDestructive?: boolean;
    isPrimary?: boolean;
    children: React.ReactNode;
    badge?: boolean;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'relative w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-200',
        'hover:scale-105 active:scale-95',
        isDestructive && 'bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/30',
        isPrimary && 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30',
        !isDestructive && !isPrimary && isActive && 'bg-primary/20 text-primary border border-primary/30',
        !isDestructive && !isPrimary && !isActive && 'bg-secondary/80 hover:bg-secondary text-foreground border border-border/50',
        className
      )}
    >
      {children}
      {badge && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg">
          <span className="w-2 h-2 bg-primary-foreground rounded-full" />
        </span>
      )}
    </button>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 flex justify-center items-center z-50 pointer-events-none">
      <div className="pointer-events-auto backdrop-blur-2xl bg-card/80 rounded-3xl px-4 md:px-6 py-4 flex items-center gap-2 md:gap-3 shadow-2xl border border-border/50">
        
        {/* Room ID - Desktop only */}
        <button
          onClick={copyRoomId}
          className="hidden xl:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/60 hover:bg-secondary transition-all border border-border/30"
        >
          <span className="text-xs text-muted-foreground">Room:</span>
          <span className="text-sm font-mono font-semibold text-foreground">{roomId}</span>
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <div className="hidden xl:block w-px h-10 bg-border/50" />

        {/* Primary controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Audio toggle */}
          <ControlButton 
            onClick={onToggleAudio} 
            isDestructive={!isAudioEnabled}
          >
            {isAudioEnabled ? (
              <Mic className="w-5 h-5 md:w-6 md:h-6" />
            ) : (
              <MicOff className="w-5 h-5 md:w-6 md:h-6" />
            )}
          </ControlButton>

          {/* Video toggle */}
          <ControlButton 
            onClick={onToggleVideo} 
            isDestructive={!isVideoEnabled}
          >
            {isVideoEnabled ? (
              <Video className="w-5 h-5 md:w-6 md:h-6" />
            ) : (
              <VideoOff className="w-5 h-5 md:w-6 md:h-6" />
            )}
          </ControlButton>

          {/* Screen share toggle */}
          <ControlButton 
            onClick={onToggleScreenShare} 
            isPrimary={isScreenSharing}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-5 h-5 md:w-6 md:h-6" />
            ) : (
              <Monitor className="w-5 h-5 md:w-6 md:h-6" />
            )}
          </ControlButton>
        </div>

        <div className="w-px h-10 bg-border/50" />

        {/* Secondary controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Chat toggle */}
          <ControlButton 
            onClick={onToggleChat} 
            isActive={isChatOpen}
            badge={hasUnreadMessages}
          >
            <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
          </ControlButton>

          {/* Transcription toggle */}
          <ControlButton 
            onClick={onToggleTranscription} 
            isActive={isTranscriptionOpen || isTranscribing}
          >
            <Languages className="w-5 h-5 md:w-6 md:h-6" />
          </ControlButton>

          {/* Recording toggle */}
          <ControlButton 
            onClick={onToggleRecording} 
            isDestructive={isRecording}
            className={isRecording ? 'animate-pulse' : ''}
          >
            {isRecording ? (
              <Square className="w-5 h-5 md:w-6 md:h-6" />
            ) : (
              <Circle className="w-5 h-5 md:w-6 md:h-6" />
            )}
          </ControlButton>
        </div>

        {/* Mobile more menu */}
        <div className="xl:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center bg-secondary/80 hover:bg-secondary text-foreground border border-border/50 transition-all">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={copyRoomId}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Room ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="w-px h-10 bg-border/50" />

        {/* Leave call */}
        <ControlButton onClick={onLeaveCall} isDestructive>
          <PhoneOff className="w-5 h-5 md:w-6 md:h-6" />
        </ControlButton>
      </div>
    </div>
  );
}
