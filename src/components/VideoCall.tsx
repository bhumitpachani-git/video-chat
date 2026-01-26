import { useState, useEffect } from 'react';
import { VideoGrid } from './VideoGrid';
import { CallControls } from './CallControls';
import { ChatPanel } from './ChatPanel';
import { TranscriptionPanel, TranscriptEntry } from './TranscriptionPanel';
import { ParticipantsList } from './ParticipantsList';
import { SettingsPanel } from './SettingsPanel';
import { PollsPanel } from './PollsPanel';
import { WhiteboardPanel } from './WhiteboardPanel';
import { NotesPanel } from './NotesPanel';
import { RemoteStream, ChatMessage, ScreenShareStream, Poll, WhiteboardStroke } from '@/lib/mediasoup';
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
  onWhiteboardStroke: (stroke: WhiteboardStroke) => void;
  onWhiteboardClear: () => void;
  onUpdateNotes: (notes: string) => void;
}

type PanelType = 'chat' | 'transcription' | 'participants' | 'settings' | 'polls' | 'whiteboard' | 'notes' | null;

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
  onWhiteboardStroke,
  onWhiteboardClear,
  onUpdateNotes,
}: VideoCallProps) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');

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
          layoutMode={layoutMode}
        />

        {/* Top bar with layout toggle and recording indicator */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex items-center gap-2 z-20">
          {/* Layout toggle */}
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
        {activePanel === 'polls' && (
          <PollsPanel
            polls={polls}
            onCreatePoll={onCreatePoll}
            onVote={onVote}
            onClosePoll={onClosePoll}
            onClose={closePanel}
            currentSocketId={socketId}
          />
        )}
        {activePanel === 'whiteboard' && (
          <WhiteboardPanel
            strokes={whiteboardStrokes}
            onStroke={onWhiteboardStroke}
            onClear={onWhiteboardClear}
            onClose={closePanel}
          />
        )}
        {activePanel === 'notes' && (
          <NotesPanel
            notes={sharedNotes}
            onUpdateNotes={onUpdateNotes}
            onClose={closePanel}
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
        onTogglePolls={() => togglePanel('polls')}
        onToggleWhiteboard={() => togglePanel('whiteboard')}
        onToggleNotes={() => togglePanel('notes')}
        onLeaveCall={onLeaveCall}
      />
    </div>
  );
}
