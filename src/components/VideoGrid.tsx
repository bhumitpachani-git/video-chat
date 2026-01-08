import React from 'react';
import { VideoTile } from './VideoTile';
import { RemoteStream } from '@/lib/mediasoup';
import { cn } from '@/lib/utils';

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, RemoteStream>;
  username: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export function VideoGrid({
  localStream,
  remoteStreams,
  username,
  isVideoEnabled,
  isAudioEnabled,
}: VideoGridProps) {
  const totalParticipants = remoteStreams.size + 1; // +1 for local
  const remoteArray = Array.from(remoteStreams.values());

  // Get grid class based on participant count
  const getGridClass = () => {
    if (totalParticipants === 1) return 'grid-cols-1 max-w-3xl mx-auto';
    if (totalParticipants === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalParticipants === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    if (totalParticipants === 4) return 'grid-cols-2';
    if (totalParticipants <= 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  };

  // Should we use floating self-view?
  const useFloatingSelfView = totalParticipants >= 2;

  return (
    <div className="relative w-full h-full p-4">
      {/* Main grid */}
      <div className={cn(
        'grid gap-3 h-full auto-rows-fr',
        getGridClass()
      )}>
        {/* Show local video in grid only when alone */}
        {!useFloatingSelfView && (
          <VideoTile
            stream={localStream}
            username={username}
            isLocal
            isMuted={!isAudioEnabled}
            isVideoOff={!isVideoEnabled}
          />
        )}

        {/* Remote participants */}
        {remoteArray.map((remote) => (
          <VideoTile
            key={remote.socketId}
            stream={remote.stream}
            username={remote.username}
          />
        ))}
      </div>

      {/* Floating self-view when there are other participants */}
      {useFloatingSelfView && (
        <div className="absolute bottom-6 right-6 w-48 md:w-56 lg:w-64 shadow-2xl z-10 transition-all duration-300 hover:scale-105">
          <VideoTile
            stream={localStream}
            username={username}
            isLocal
            isMuted={!isAudioEnabled}
            isVideoOff={!isVideoEnabled}
            isSmall
          />
        </div>
      )}

      {/* Empty state when waiting for others */}
      {remoteStreams.size === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div className="glass-effect px-6 py-4 rounded-2xl">
            <p className="text-muted-foreground text-lg animate-pulse-slow">
              Waiting for others to join...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
