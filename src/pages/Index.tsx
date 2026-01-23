import { useVideoCall } from '@/hooks/useVideoCall';
import { JoinRoomForm } from '@/components/JoinRoomForm';
import { VideoCall } from '@/components/VideoCall';

const Index = () => {
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
    sendWhiteboardStroke,
    clearWhiteboard,
    updateNotes,
  } = useVideoCall();

  const isConnecting = connectionState === 'connecting';
  const isInCall = connectionState === 'in-call';

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
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onToggleScreenShare={toggleScreenShare}
        onToggleRecording={toggleRecording}
        onToggleTranscription={toggleTranscription}
        onLanguageChange={setSelectedLanguage}
        onSendMessage={sendChatMessage}
        onLeaveCall={leaveRoom}
        onCreatePoll={createPoll}
        onVote={submitVote}
        onClosePoll={closePoll}
        onWhiteboardStroke={sendWhiteboardStroke}
        onWhiteboardClear={clearWhiteboard}
        onUpdateNotes={updateNotes}
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
