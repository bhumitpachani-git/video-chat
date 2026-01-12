import React, { useState, useEffect } from 'react';
import { VideoGrid } from './VideoGrid';
import { CallControls } from './CallControls';
import { ChatPanel } from './ChatPanel';
import { TranscriptionPanel, TranscriptEntry } from './TranscriptionPanel';
import { ParticipantsList } from './ParticipantsList';
import { SettingsPanel } from './SettingsPanel';
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

type PanelType = 'chat' | 'transcription' | 'participants' | 'settings' | null;

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
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0);

  const hasUnreadMessages = chatMessages.length > lastSeenMessageCount && activePanel !== 'chat';
  const participantCount = 1 + remoteStreams.size;

  useEffect(() => {
    if (activePanel === 'chat') {
      setLastSeenMessageCount(chatMessages.length);
    }
  }, [activePanel, chatMessages.length]);

  const togglePanel = (panel: PanelType) => {
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
      // Start transcription if opening transcription panel
      if (panel === 'transcription' && !isTranscribing) {
        onToggleTranscription();
      }
    }
  };

  const closePanel = () => setActivePanel(null);

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Main video area - takes full screen */}
      <main className={cn(
        'flex-1 relative transition-all duration-300',
        activePanel && 'md:mr-80 lg:mr-96'
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

      {/* Side panel */}
      <div className={cn(
        'fixed inset-y-0 right-0 w-full sm:w-80 lg:w-96 z-30',
        'bg-card border-l border-border',
        'transition-transform duration-300 ease-out',
        activePanel ? 'translate-x-0' : 'translate-x-full'
      )}>
        {activePanel === 'chat' && (
          <ChatPanel
            messages={chatMessages}
            currentSocketId={socketId}
            onSendMessage={onSendMessage}
            onClose={closePanel}
          />
        )}
        {activePanel === 'transcription' && (
          <TranscriptionPanel
            transcripts={transcripts}
            currentSocketId={socketId}
            selectedLanguage={selectedLanguage}
            onLanguageChange={onLanguageChange}
            onClose={closePanel}
            isTranscribing={isTranscribing}
          />
        )}
        {activePanel === 'participants' && (
          <ParticipantsList
            localUsername={username}
            isLocalVideoEnabled={isVideoEnabled}
            isLocalAudioEnabled={isAudioEnabled}
            isLocalScreenSharing={isScreenSharing}
            remoteStreams={remoteStreams}
            screenShareStreams={screenShareStreams}
            onClose={closePanel}
          />
        )}
        {activePanel === 'settings' && (
          <SettingsPanel onClose={closePanel} />
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
        isChatOpen={activePanel === 'chat'}
        isTranscriptionOpen={activePanel === 'transcription'}
        participantCount={participantCount}
        onToggleVideo={onToggleVideo}
        onToggleAudio={onToggleAudio}
        onToggleScreenShare={onToggleScreenShare}
        onToggleChat={() => togglePanel('chat')}
        onToggleTranscription={() => togglePanel('transcription')}
        onToggleRecording={onToggleRecording}
        onToggleParticipants={() => togglePanel('participants')}
        onToggleSettings={() => togglePanel('settings')}
        onLeaveCall={onLeaveCall}
      />
    </div>
  );
}
