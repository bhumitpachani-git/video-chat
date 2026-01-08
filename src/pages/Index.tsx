import React from 'react';
import { useVideoCall } from '@/hooks/useVideoCall';
import { JoinRoomForm } from '@/components/JoinRoomForm';
import { VideoCall } from '@/components/VideoCall';

const Index = () => {
  const {
    connectionState,
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    error,
    roomId,
    username,
    joinRoom,
    leaveRoom,
    toggleVideo,
    toggleAudio,
  } = useVideoCall();

  const isConnecting = connectionState === 'connecting';
  const isInCall = connectionState === 'in-call';

  if (isInCall) {
    return (
      <VideoCall
        localStream={localStream}
        remoteStreams={remoteStreams}
        username={username}
        roomId={roomId}
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
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
