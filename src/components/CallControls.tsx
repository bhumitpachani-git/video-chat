import { useState } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Check, 
  Monitor, MonitorOff, MessageCircle, Languages, Circle, Square,
  MoreHorizontal, Share2, Volume2, Users, Maximize, Settings,
  BarChart2, Pen, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { NetworkIndicator } from '@/components/NetworkIndicator';

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
  participantCount?: number;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleTranscription: () => void;
  onToggleRecording: () => void;
  onToggleParticipants: () => void;
  onToggleSettings: () => void;
  onTogglePolls: () => void;
  onToggleWhiteboard: () => void;
  onToggleNotes: () => void;
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
  participantCount = 1,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onToggleChat,
  onToggleTranscription,
  onToggleRecording,
  onToggleParticipants,
  onToggleSettings,
  onTogglePolls,
  onToggleWhiteboard,
  onToggleNotes,
  onLeaveCall,
}: CallControlsProps) {
  const [copied, setCopied] = useState(false);
  const [volume, setVolume] = useState([80]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const networkStatus = useNetworkStatus();

  const copyRoomId = async () => {
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    toast.success('Room ID copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInvite = async () => {
    const inviteLink = `${window.location.origin}?room=${roomId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my video call',
          text: 'Click the link to join my video call',
          url: inviteLink,
        });
      } catch (err) {
        // User cancelled or share failed, copy to clipboard instead
        await navigator.clipboard.writeText(inviteLink);
        toast.success('Invite link copied!');
      }
    } else {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied!');
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    // Apply volume to all audio elements
    document.querySelectorAll('audio, video').forEach((element) => {
      (element as HTMLMediaElement).volume = value[0] / 100;
    });
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
        
        {/* Network status indicator */}
        <div className="hidden sm:block mr-1">
          <NetworkIndicator status={networkStatus} compact />
        </div>

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

        {/* Participants - visible on larger screens */}
        <div className="hidden md:block">
          <ControlButton 
            onClick={onToggleParticipants}
            label="Participants"
          >
            <div className="relative">
              <Users className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-0.5">
                {participantCount}
              </span>
            </div>
          </ControlButton>
        </div>

        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-muted hover:bg-muted/80 text-foreground transition-all active:scale-95">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="mb-2 w-56">
            {/* Network Status - mobile only */}
            <div className="sm:hidden px-2 py-2 border-b border-border mb-1">
              <NetworkIndicator status={networkStatus} showDetails />
            </div>

            <DropdownMenuItem onClick={copyRoomId}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Copy Room ID
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={shareInvite}>
              <Share2 className="w-4 h-4 mr-2" />
              Share Invite
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onToggleRecording}>
              {isRecording ? (
                <>
                  <Square className="w-4 h-4 mr-2 text-destructive" />
                  <span className="text-destructive">Stop Recording</span>
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4 mr-2" />
                  Start Recording
                </>
              )}
            </DropdownMenuItem>

            {/* Volume submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Volume2 className="w-4 h-4 mr-2" />
                Volume
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48 p-3">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <Slider
                    value={volume}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8">{volume[0]}%</span>
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onToggleParticipants} className="md:hidden">
              <Users className="w-4 h-4 mr-2" />
              View Participants ({participantCount})
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onToggleTranscription} className="sm:hidden">
              <Languages className="w-4 h-4 mr-2" />
              {isTranscriptionOpen ? 'Close Transcription' : 'Transcription'}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onToggleScreenShare} className="sm:hidden">
              <Monitor className="w-4 h-4 mr-2" />
              {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={toggleFullscreen}>
              <Maximize className="w-4 h-4 mr-2" />
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onTogglePolls}>
              <BarChart2 className="w-4 h-4 mr-2" />
              Polls
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onToggleWhiteboard}>
              <Pen className="w-4 h-4 mr-2" />
              Whiteboard
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onToggleNotes}>
              <FileText className="w-4 h-4 mr-2" />
              Shared Notes
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onToggleSettings}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
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
