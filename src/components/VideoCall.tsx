import { useState, useEffect } from 'react';
import { VideoGrid } from './VideoGrid';
import { CallControls } from './CallControls';
import { ChatPanel } from './ChatPanel';
import { TranscriptionPanel, TranscriptEntry } from './TranscriptionPanel';
import { ParticipantsList } from './ParticipantsList';
import { SettingsPanel } from './SettingsPanel';
import { PollModal } from './PollModal';
import { CreatePollModal } from './CreatePollModal';
import { FullscreenWhiteboard } from './FullscreenWhiteboard';
import { FullscreenNotes } from './FullscreenNotes';
import { RemoteStream, ChatMessage, ScreenShareStream, Poll, WhiteboardStroke } from '@/lib/mediasoup';
import { PresentingState } from '@/hooks/useVideoCall';
import { cn } from '@/lib/utils';
import { LayoutGrid, Rows } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type LayoutMode = 'grid' | 'speaker';

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
  polls: Poll[];
  whiteboardStrokes: WhiteboardStroke[];
  sharedNotes: string;
  presentingState: PresentingState | null;
  activePoll: Poll | null;
  votedPolls: Set<string>;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording: () => void;
  onToggleTranscription: () => void;
  onLanguageChange: (language: string) => void;
  onSendMessage: (message: string) => void;
  onLeaveCall: () => void;
  onCreatePoll: (question: string, options: string[], isAnonymous: boolean, allowMultiple: boolean) => void;
  onVote: (pollId: string, selectedOptions: number[]) => void;
  onClosePoll: (pollId: string) => void;
  onDismissActivePoll: () => void;
  onWhiteboardStroke: (stroke: WhiteboardStroke) => void;
  onWhiteboardClear: () => void;
  onUpdateNotes: (notes: string) => void;
  onPresentWhiteboard: (isPresenting: boolean) => void;
  onPresentNotes: (isPresenting: boolean) => void;
  onStopPresenting: () => void;
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
  polls,
  whiteboardStrokes,
  sharedNotes,
  presentingState,
  activePoll,
  votedPolls,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onToggleRecording,
  onToggleTranscription,
  onLanguageChange,
  onSendMessage,
  onLeaveCall,
  onCreatePoll,
  onVote,
  onClosePoll,
  onDismissActivePoll,
  onWhiteboardStroke,
  onWhiteboardClear,
  onUpdateNotes,
  onPresentWhiteboard,
  onPresentNotes,
  onStopPresenting,
}: VideoCallProps) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [showCreatePoll, setShowCreatePoll] = useState(false);

  const hasUnreadMessages = chatMessages.length > lastSeenMessageCount && activePanel !== 'chat';
  const participantCount = 1 + remoteStreams.size;
  const isPresenter = presentingState?.socketId === socketId;

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
      if (panel === 'transcription' && !isTranscribing) {
        onToggleTranscription();
      }
    }
  };

  const closePanel = () => setActivePanel(null);

  const handleToggleWhiteboard = () => {
    if (presentingState?.type === 'whiteboard' && isPresenter) {
      onStopPresenting();
    } else {
      onPresentWhiteboard(true);
    }
  };

  const handleToggleNotes = () => {
    if (presentingState?.type === 'notes' && isPresenter) {
      onStopPresenting();
    } else {
      onPresentNotes(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Main video area */}
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
          layoutMode={layoutMode}
        />

        {/* Top bar with layout toggle and recording indicator */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex items-center gap-2 z-20">
          <div className="flex items-center bg-card/80 backdrop-blur-lg rounded-lg border border-border p-1">
            <Button
              variant={layoutMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => setLayoutMode('grid')}
              data-testid="button-layout-grid"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={layoutMode === 'speaker' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => setLayoutMode('speaker')}
              data-testid="button-layout-speaker"
            >
              <Rows className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 text-destructive-foreground text-sm font-medium z-20">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="hidden sm:inline">Recording</span>
            <span className="sm:hidden">REC</span>
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

      {/* Fullscreen Whiteboard Overlay */}
      {presentingState?.type === 'whiteboard' && (
        <FullscreenWhiteboard
          strokes={whiteboardStrokes}
          presenterName={presentingState.username}
          isPresenter={isPresenter}
          onStroke={isPresenter ? onWhiteboardStroke : undefined}
          onClose={isPresenter ? onStopPresenting : () => {}}
        />
      )}

      {/* Fullscreen Notes Overlay */}
      {presentingState?.type === 'notes' && (
        <FullscreenNotes
          notes={sharedNotes}
          presenterName={presentingState.username}
          isPresenter={isPresenter}
          onUpdateNotes={isPresenter ? onUpdateNotes : undefined}
          onClose={isPresenter ? onStopPresenting : () => {}}
        />
      )}

      {/* Poll Modal */}
      <PollModal
        poll={activePoll}
        onVote={onVote}
        onClose={onDismissActivePoll}
        hasVoted={activePoll ? votedPolls.has(activePoll.id) : false}
      />

      {/* Create Poll Modal */}
      <CreatePollModal
        open={showCreatePoll}
        onOpenChange={setShowCreatePoll}
        onCreatePoll={onCreatePoll}
      />

      {/* Controls */}
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
        onTogglePolls={() => setShowCreatePoll(true)}
        onToggleWhiteboard={handleToggleWhiteboard}
        onToggleNotes={handleToggleNotes}
        onLeaveCall={onLeaveCall}
      />
    </div>
  );
}
