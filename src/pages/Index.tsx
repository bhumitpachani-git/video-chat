import React from 'react';
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
    joinRoom,
    leaveRoom,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    toggleRecording,
    toggleTranscription,
    setSelectedLanguage,
    sendChatMessage,
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
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onToggleScreenShare={toggleScreenShare}
        onToggleRecording={toggleRecording}
        onToggleTranscription={toggleTranscription}
        onLanguageChange={setSelectedLanguage}
        onSendMessage={sendChatMessage}
        onLeaveCall={leaveRoom}
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
