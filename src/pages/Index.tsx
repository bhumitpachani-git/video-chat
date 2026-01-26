import { useState } from 'react';
import { useVideoCall } from '@/hooks/useVideoCall';
import { JoinRoomForm } from '@/components/JoinRoomForm';
import { VideoCall } from '@/components/VideoCall';

const Index = () => {
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());
  
  const {
    connectionState,
    localStream,
    localScreenStream,
    remoteStreams,
    screenShareStreams,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    isRecording,
    isTranscribing,
    transcripts,
    selectedLanguage,
    error,
    roomId,
    username,
    socketId,
    chatMessages,
    polls,
    whiteboardStrokes,
    sharedNotes,
    presentingState,
    activePoll,
    joinRoom,
    leaveRoom,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    toggleRecording,
    toggleTranscription,
    setSelectedLanguage,
    sendChatMessage,
    createPoll,
    submitVote,
    closePoll,
    dismissActivePoll,
    sendWhiteboardStroke,
    clearWhiteboard,
    updateNotes,
    presentWhiteboard,
    presentNotes,
    stopPresenting,
  } = useVideoCall();

  const isConnecting = connectionState === 'connecting';
  const isInCall = connectionState === 'in-call';

  const handleVote = (pollId: string, selectedOptions: number[]) => {
    submitVote(pollId, selectedOptions);
    setVotedPolls(prev => new Set(prev).add(pollId));
  };

  if (isInCall) {
    return (
      <VideoCall
        localStream={localStream}
        localScreenStream={localScreenStream}
        remoteStreams={remoteStreams}
        screenShareStreams={screenShareStreams}
        username={username}
        roomId={roomId}
        socketId={socketId}
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        isScreenSharing={isScreenSharing}
        isRecording={isRecording}
        chatMessages={chatMessages}
        transcripts={transcripts}
        isTranscribing={isTranscribing}
        selectedLanguage={selectedLanguage}
        polls={polls}
        whiteboardStrokes={whiteboardStrokes}
        sharedNotes={sharedNotes}
        presentingState={presentingState}
        activePoll={activePoll}
        votedPolls={votedPolls}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onToggleScreenShare={toggleScreenShare}
        onToggleRecording={toggleRecording}
        onToggleTranscription={toggleTranscription}
        onLanguageChange={setSelectedLanguage}
        onSendMessage={sendChatMessage}
        onLeaveCall={leaveRoom}
        onCreatePoll={createPoll}
        onVote={handleVote}
        onClosePoll={closePoll}
        onDismissActivePoll={dismissActivePoll}
        onWhiteboardStroke={sendWhiteboardStroke}
        onWhiteboardClear={clearWhiteboard}
        onUpdateNotes={updateNotes}
        onPresentWhiteboard={presentWhiteboard}
        onPresentNotes={presentNotes}
        onStopPresenting={stopPresenting}
      />
    );
  }

  return (
    <JoinRoomForm
      onJoin={joinRoom}
      isLoading={isConnecting}
      error={error}
    />
  );
};

export default Index;
