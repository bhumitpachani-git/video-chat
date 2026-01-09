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
  const remoteArray = Array.from(remoteStreams.values());
  const totalParticipants = remoteArray.length + 1;

  // Smart grid layout based on participant count
  const getGridConfig = () => {
    if (totalParticipants === 1) {
      return {
        gridClass: 'grid-cols-1',
        containerClass: 'max-w-3xl mx-auto',
        gap: 'gap-4'
      };
    }
    if (totalParticipants === 2) {
      return {
        gridClass: 'grid-cols-1 md:grid-cols-2',
        containerClass: 'max-w-5xl mx-auto',
        gap: 'gap-4 md:gap-6'
      };
    }
    if (totalParticipants === 3) {
      return {
        gridClass: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        containerClass: 'max-w-6xl mx-auto',
        gap: 'gap-3 md:gap-4'
      };
    }
    if (totalParticipants === 4) {
      return {
        gridClass: 'grid-cols-2',
        containerClass: 'max-w-5xl mx-auto',
        gap: 'gap-3 md:gap-4'
      };
    }
    if (totalParticipants <= 6) {
      return {
        gridClass: 'grid-cols-2 lg:grid-cols-3',
        containerClass: 'max-w-6xl mx-auto',
        gap: 'gap-3'
      };
    }
    if (totalParticipants <= 9) {
      return {
        gridClass: 'grid-cols-2 md:grid-cols-3',
        containerClass: '',
        gap: 'gap-2 md:gap-3'
      };
    }
    return {
      gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
      containerClass: '',
      gap: 'gap-2'
    };
  };

  const config = getGridConfig();

  return (
    <div className="relative w-full h-full p-3 md:p-6 pb-28 md:pb-32 overflow-auto">
      <div className={cn(
        'grid auto-rows-fr',
        config.gridClass,
        config.containerClass,
        config.gap
      )}>
        {/* Local video - always first with special styling */}
        <div className="relative group">
          <VideoTile
            stream={localStream}
            username={username}
            isLocal
            isMuted={!isAudioEnabled}
            isVideoOff={!isVideoEnabled}
          />
        </div>

        {/* Remote participants */}
        {remoteArray.map((remote) => (
          <div key={remote.socketId} className="relative group">
            <VideoTile
              stream={remote.stream}
              username={remote.username}
            />
          </div>
        ))}
      </div>

      {/* Empty state when waiting for others */}
      {remoteStreams.size === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-24">
          <div className="backdrop-blur-xl bg-card/60 px-8 py-5 rounded-2xl border border-border/50 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-3 h-3 bg-primary rounded-full animate-ping absolute" />
                <div className="w-3 h-3 bg-primary rounded-full" />
              </div>
              <p className="text-muted-foreground text-base md:text-lg font-medium">
                Waiting for others to join...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
