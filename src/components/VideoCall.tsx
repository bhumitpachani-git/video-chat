import React, { useState, useEffect } from 'react';
import { VideoGrid } from './VideoGrid';
import { CallControls } from './CallControls';
import { ChatPanel } from './ChatPanel';
import { RemoteStream, ChatMessage } from '@/lib/mediasoup';
import { cn } from '@/lib/utils';

interface VideoCallProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, RemoteStream>;
  username: string;
  roomId: string;
  socketId?: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  chatMessages: ChatMessage[];
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onSendMessage: (message: string) => void;
  onLeaveCall: () => void;
}

export function VideoCall({
  localStream,
  remoteStreams,
  username,
  roomId,
  socketId,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  chatMessages,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onSendMessage,
  onLeaveCall,
}: VideoCallProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0);

  const hasUnreadMessages = chatMessages.length > lastSeenMessageCount && !isChatOpen;

  useEffect(() => {
    if (isChatOpen) {
      setLastSeenMessageCount(chatMessages.length);
    }
  }, [isChatOpen, chatMessages.length]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 p-3 md:p-4 flex items-center justify-between glass-effect border-b border-border z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs md:text-sm">VC</span>
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-sm md:text-base">Video Call</h1>
            <p className="text-xs text-muted-foreground">
              {remoteStreams.size + 1} participant{remoteStreams.size !== 0 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-secondary/50">
          <span className="text-xs md:text-sm text-muted-foreground">Room:</span>
          <span className="text-xs md:text-sm font-mono font-medium text-foreground">{roomId}</span>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <main className={cn(
          'flex-1 relative pb-24 transition-all duration-300',
          isChatOpen && 'lg:mr-80'
        )}>
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            username={username}
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
          />
        </main>

        {/* Chat panel */}
        <div className={cn(
          'fixed lg:absolute right-0 top-0 bottom-0 w-full sm:w-80 z-30 transition-transform duration-300',
          isChatOpen ? 'translate-x-0' : 'translate-x-full'
        )}>
          <ChatPanel
            messages={chatMessages}
            currentSocketId={socketId}
            onSendMessage={onSendMessage}
            onClose={() => setIsChatOpen(false)}
          />
        </div>
      </div>

      {/* Controls */}
      <CallControls
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        isScreenSharing={isScreenSharing}
        roomId={roomId}
        hasUnreadMessages={hasUnreadMessages}
        onToggleVideo={onToggleVideo}
        onToggleAudio={onToggleAudio}
        onToggleScreenShare={onToggleScreenShare}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onLeaveCall={onLeaveCall}
      />
    </div>
  );
}
