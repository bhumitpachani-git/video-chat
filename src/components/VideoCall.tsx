import React, { useState, useEffect } from 'react';
import { VideoGrid } from './VideoGrid';
import { CallControls } from './CallControls';
import { ChatPanel } from './ChatPanel';
import { TranscriptionPanel, TranscriptEntry } from './TranscriptionPanel';
import { RemoteStream, ChatMessage, ScreenShareStream } from '@/lib/mediasoup';
import { cn } from '@/lib/utils';

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
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Main video area - takes full screen */}
      <main className={cn(
        'flex-1 relative transition-all duration-300',
        (isChatOpen || isTranscriptionOpen) && 'md:mr-80 lg:mr-96'
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

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 text-destructive-foreground text-sm font-medium z-20">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Recording
          </div>
        )}
      </main>

      {/* Side panel - Chat or Transcription */}
      <div className={cn(
        'fixed inset-y-0 right-0 w-full sm:w-80 lg:w-96 z-30',
        'bg-card border-l border-border',
        'transition-transform duration-300 ease-out',
        (isChatOpen || isTranscriptionOpen) ? 'translate-x-0' : 'translate-x-full'
      )}>
        {isChatOpen && (
          <ChatPanel
            messages={chatMessages}
            currentSocketId={socketId}
            onSendMessage={onSendMessage}
            onClose={() => setIsChatOpen(false)}
          />
        )}
        {isTranscriptionOpen && (
          <TranscriptionPanel
            transcripts={transcripts}
            currentSocketId={socketId}
            selectedLanguage={selectedLanguage}
            onLanguageChange={onLanguageChange}
            onClose={() => setIsTranscriptionOpen(false)}
            isTranscribing={isTranscribing}
          />
        )}
      </div>

      {/* Controls - fixed at bottom */}
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