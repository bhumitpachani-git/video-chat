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

  // Get grid layout based on participant count
  const getGridLayout = () => {
    if (totalParticipants === 1) {
      return {
        gridClass: 'grid-cols-1',
        containerClass: 'max-w-4xl mx-auto',
        itemClass: 'aspect-video'
      };
    }
    if (totalParticipants === 2) {
      return {
        gridClass: 'grid-cols-1 lg:grid-cols-2',
        containerClass: 'max-w-6xl mx-auto',
        itemClass: 'aspect-video'
      };
    }
    if (totalParticipants === 3) {
      return {
        gridClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        containerClass: '',
        itemClass: 'aspect-video'
      };
    }
    if (totalParticipants === 4) {
      return {
        gridClass: 'grid-cols-2',
        containerClass: 'max-w-5xl mx-auto',
        itemClass: 'aspect-video'
      };
    }
    if (totalParticipants <= 6) {
      return {
        gridClass: 'grid-cols-2 lg:grid-cols-3',
        containerClass: '',
        itemClass: 'aspect-video'
      };
    }
    return {
      gridClass: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
      containerClass: '',
      itemClass: 'aspect-video'
    };
  };

  const layout = getGridLayout();

  return (
    <div className="relative w-full h-full p-3 md:p-4 lg:p-6 overflow-auto">
      <div className={cn(
        'grid gap-3 md:gap-4',
        layout.gridClass,
        layout.containerClass
      )}>
        {/* Local video - always first */}
        <div className={cn(layout.itemClass)}>
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
          <div key={remote.socketId} className={cn(layout.itemClass)}>
            <VideoTile
              stream={remote.stream}
              username={remote.username}
            />
          </div>
        ))}
      </div>

      {/* Empty state when waiting for others */}
      {remoteStreams.size === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="glass-effect px-6 py-4 rounded-2xl mt-20">
            <p className="text-muted-foreground text-base md:text-lg animate-pulse">
              Waiting for others to join...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
