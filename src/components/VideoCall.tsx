import React from 'react';
import { VideoGrid } from './VideoGrid';
import { CallControls } from './CallControls';
import { RemoteStream } from '@/lib/mediasoup';

interface VideoCallProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, RemoteStream>;
  username: string;
  roomId: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onLeaveCall: () => void;
}

export function VideoCall({
  localStream,
  remoteStreams,
  username,
  roomId,
  isVideoEnabled,
  isAudioEnabled,
  onToggleVideo,
  onToggleAudio,
  onLeaveCall,
}: VideoCallProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between glass-effect border-b border-border z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">VC</span>
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Video Call</h1>
            <p className="text-xs text-muted-foreground">
              {remoteStreams.size + 1} participant{remoteStreams.size !== 0 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/50">
          <span className="text-sm text-muted-foreground">Room:</span>
          <span className="text-sm font-mono font-medium text-foreground">{roomId}</span>
        </div>
      </header>

      {/* Main video area */}
      <main className="flex-1 relative pb-24">
        <VideoGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          username={username}
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
        />
      </main>

      {/* Controls */}
      <CallControls
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        roomId={roomId}
        onToggleVideo={onToggleVideo}
        onToggleAudio={onToggleAudio}
        onLeaveCall={onLeaveCall}
      />
    </div>
  );
}
