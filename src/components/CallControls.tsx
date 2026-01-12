import React, { useState } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Check, 
  Monitor, MonitorOff, MessageCircle, Languages, Circle, Square,
  MoreHorizontal
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
    toast.success('Room ID copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const ControlButton = ({ 
    onClick, 
    active, 
    danger = false,
    children,
    badge,
    className,
    label,
  }: { 
    onClick: () => void; 
    active?: boolean;
    danger?: boolean;
    children: React.ReactNode;
    badge?: boolean;
    className?: string;
    label?: string;
  }) => (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all',
        'active:scale-95',
        danger && 'bg-destructive text-white hover:bg-destructive/90',
        !danger && active && 'bg-primary text-primary-foreground',
        !danger && !active && 'bg-muted hover:bg-muted/80 text-foreground',
        className
      )}
    >
      {children}
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
      )}
    </button>
  );

  return (
    <div className="fixed bottom-0 inset-x-0 p-3 sm:p-4 flex justify-center z-40 pointer-events-none">
      <div className="pointer-events-auto bg-card/95 backdrop-blur-lg rounded-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-1.5 sm:gap-2 shadow-xl border border-border">
        
        {/* Audio toggle */}
        <ControlButton 
          onClick={onToggleAudio} 
          danger={!isAudioEnabled}
          label={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </ControlButton>

        {/* Video toggle */}
        <ControlButton 
          onClick={onToggleVideo} 
          danger={!isVideoEnabled}
          label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? (
            <Video className="w-5 h-5" />
          ) : (
            <VideoOff className="w-5 h-5" />
          )}
        </ControlButton>

        {/* Screen share - hidden on very small screens */}
        <div className="hidden sm:block">
          <ControlButton 
            onClick={onToggleScreenShare} 
            active={isScreenSharing}
            label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
          </ControlButton>
        </div>

        {/* Chat toggle */}
        <ControlButton 
          onClick={onToggleChat} 
          active={isChatOpen}
          badge={hasUnreadMessages}
          label="Chat"
        >
          <MessageCircle className="w-5 h-5" />
        </ControlButton>

        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-muted hover:bg-muted/80 text-foreground transition-all active:scale-95">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="mb-2 w-48">
            <DropdownMenuItem onClick={copyRoomId}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Copy Room ID
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleTranscription} className="sm:hidden">
              <Languages className="w-4 h-4 mr-2" />
              {isTranscriptionOpen ? 'Close Transcription' : 'Transcription'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleScreenShare} className="sm:hidden">
              <Monitor className="w-4 h-4 mr-2" />
              {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleRecording}>
              {isRecording ? <Square className="w-4 h-4 mr-2" /> : <Circle className="w-4 h-4 mr-2" />}
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Transcription - hidden on mobile, in dropdown */}
        <div className="hidden sm:block">
          <ControlButton 
            onClick={onToggleTranscription} 
            active={isTranscriptionOpen || isTranscribing}
            label="Transcription"
          >
            <Languages className="w-5 h-5" />
          </ControlButton>
        </div>

        {/* Leave call */}
        <ControlButton onClick={onLeaveCall} danger label="Leave call">
          <PhoneOff className="w-5 h-5" />
        </ControlButton>
      </div>
    </div>
  );
}