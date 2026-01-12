import React, { useState, useEffect } from 'react';
import { VideoGrid } from './VideoGrid';
import { CallControls } from './CallControls';
import { ChatPanel } from './ChatPanel';
import { TranscriptionPanel, TranscriptEntry } from './TranscriptionPanel';
import { RemoteStream, ChatMessage, ScreenShareStream } from '@/lib/mediasoup';
import { cn } from '@/lib/utils';
import { Users, Shield, Wifi } from 'lucide-react';

interface VideoCallProps {
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  remoteStreams: Map<string, RemoteStream>;
  screenShareStreams: Map<string, ScreenShareStream>;
  username: string;
  roomId: string;
  socketId?: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  chatMessages: ChatMessage[];
  transcripts: TranscriptEntry[];
  isTranscribing: boolean;
  selectedLanguage: string;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording: () => void;
  onToggleTranscription: () => void;
  onLanguageChange: (language: string) => void;
  onSendMessage: (message: string) => void;
  onLeaveCall: () => void;
}

export function VideoCall({
  localStream,
  localScreenStream,
  remoteStreams,
  screenShareStreams,
  username,
  roomId,
  socketId,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  isRecording,
  chatMessages,
  transcripts,
  isTranscribing,
  selectedLanguage,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onToggleRecording,
  onToggleTranscription,
  onLanguageChange,
  onSendMessage,
  onLeaveCall,
}: VideoCallProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTranscriptionOpen, setIsTranscriptionOpen] = useState(false);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0);

  const hasUnreadMessages = chatMessages.length > lastSeenMessageCount && !isChatOpen;
  const participantCount = remoteStreams.size + 1;

  useEffect(() => {
    if (isChatOpen) {
      setLastSeenMessageCount(chatMessages.length);
    }
  }, [isChatOpen, chatMessages.length]);

  const handleToggleTranscription = () => {
    if (!isTranscribing && !isTranscriptionOpen) {
      onToggleTranscription();
    }
    setIsTranscriptionOpen(!isTranscriptionOpen);
  };

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (isTranscriptionOpen) setIsTranscriptionOpen(false);
  };

  const handleToggleTranscriptionPanel = () => {
    handleToggleTranscription();
    if (isChatOpen) setIsChatOpen(false);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background to-secondary/10 flex flex-col overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[80px]" />
      </div>

      {/* Header */}
      <header className="relative shrink-0 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between backdrop-blur-xl bg-card/40 border-b border-border/50 z-40">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="relative">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-sm md:text-base">VC</span>
            </div>
            {isRecording && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse ring-2 ring-background" />
            )}
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-base md:text-lg">Video Call</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {participantCount} participant{participantCount !== 1 ? 's' : ''}
              </span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <span className="flex items-center gap-1 text-success">
                <Wifi className="w-3 h-3" />
                Connected
              </span>
            </div>
          </div>
        </div>
        
        {/* Room info badge */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/60 backdrop-blur-sm border border-border/50">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Room:</span>
            <span className="text-sm font-mono font-semibold text-foreground">{roomId}</span>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Video area */}
        <main className={cn(
          'flex-1 relative transition-all duration-500 ease-out',
          (isChatOpen || isTranscriptionOpen) && 'lg:pr-[380px]'
        )}>
          <VideoGrid
            localStream={localStream}
            localScreenStream={localScreenStream}
            remoteStreams={remoteStreams}
            screenShareStreams={screenShareStreams}
            username={username}
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            isScreenSharing={isScreenSharing}
          />
        </main>

        {/* Side panels container */}
        <div className={cn(
          'fixed lg:absolute inset-y-0 right-0 w-full sm:w-[380px] z-30',
          'transition-transform duration-500 ease-out',
          (isChatOpen || isTranscriptionOpen) ? 'translate-x-0' : 'translate-x-full'
        )}>
          {/* Chat panel */}
          <div className={cn(
            'absolute inset-0 transition-opacity duration-300',
            isChatOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          )}>
            <ChatPanel
              messages={chatMessages}
              currentSocketId={socketId}
              onSendMessage={onSendMessage}
              onClose={() => setIsChatOpen(false)}
            />
          </div>

          {/* Transcription panel */}
          <div className={cn(
            'absolute inset-0 transition-opacity duration-300',
            isTranscriptionOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          )}>
            <TranscriptionPanel
              transcripts={transcripts}
              currentSocketId={socketId}
              selectedLanguage={selectedLanguage}
              onLanguageChange={onLanguageChange}
              onClose={() => setIsTranscriptionOpen(false)}
              isTranscribing={isTranscribing}
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <CallControls
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        isScreenSharing={isScreenSharing}
        isTranscribing={isTranscribing}
        isRecording={isRecording}
        roomId={roomId}
        hasUnreadMessages={hasUnreadMessages}
        isChatOpen={isChatOpen}
        isTranscriptionOpen={isTranscriptionOpen}
        onToggleVideo={onToggleVideo}
        onToggleAudio={onToggleAudio}
        onToggleScreenShare={onToggleScreenShare}
        onToggleChat={handleToggleChat}
        onToggleTranscription={handleToggleTranscriptionPanel}
        onToggleRecording={onToggleRecording}
        onLeaveCall={onLeaveCall}
      />
    </div>
  );
}
