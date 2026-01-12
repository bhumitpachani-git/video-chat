import React from 'react';
import { VideoTile } from './VideoTile';
import { RemoteStream, ScreenShareStream } from '@/lib/mediasoup';
import { cn } from '@/lib/utils';
import { Monitor } from 'lucide-react';

interface VideoGridProps {
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  remoteStreams: Map<string, RemoteStream>;
  screenShareStreams: Map<string, ScreenShareStream>;
  username: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
}

export function VideoGrid({
  localStream,
  localScreenStream,
  remoteStreams,
  screenShareStreams,
  username,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
}: VideoGridProps) {
  const remoteArray = Array.from(remoteStreams.values());
  const screenShareArray = Array.from(screenShareStreams.values());
  const hasActiveScreenShare = isScreenSharing || screenShareArray.length > 0;
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

  // When screen share is active, show a different layout
  if (hasActiveScreenShare) {
    return (
      <div className="relative w-full h-full p-3 md:p-6 pb-28 md:pb-32 overflow-auto flex flex-col lg:flex-row gap-4">
        {/* Main screen share area */}
        <div className="flex-1 min-h-0">
          {/* Local screen share */}
          {isScreenSharing && localScreenStream && (
            <div className="relative w-full h-full min-h-[300px] lg:min-h-[400px] rounded-2xl overflow-hidden bg-secondary/50 border-2 border-primary/50">
              <video
                autoPlay
                playsInline
                muted
                ref={(el) => {
                  if (el && localScreenStream) {
                    el.srcObject = localScreenStream;
                  }
                }}
                className="w-full h-full object-contain bg-black"
              />
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/90 text-primary-foreground text-sm font-medium">
                <Monitor className="w-4 h-4" />
                <span>You are sharing your screen</span>
              </div>
            </div>
          )}
          
          {/* Remote screen shares */}
          {screenShareArray.map((screenShare) => (
            <div key={screenShare.socketId} className="relative w-full h-full min-h-[300px] lg:min-h-[400px] rounded-2xl overflow-hidden bg-secondary/50 border-2 border-accent/50">
              <video
                autoPlay
                playsInline
                ref={(el) => {
                  if (el && screenShare.stream) {
                    el.srcObject = screenShare.stream;
                  }
                }}
                className="w-full h-full object-contain bg-black"
              />
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/90 text-accent-foreground text-sm font-medium">
                <Monitor className="w-4 h-4" />
                <span>{screenShare.username}'s screen</span>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar with participants */}
        <div className="lg:w-64 xl:w-80 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto pb-2 lg:pb-0 shrink-0">
          {/* Local video thumbnail */}
          <div className="w-40 lg:w-full shrink-0">
            <VideoTile
              stream={localStream}
              username={username}
              isLocal
              isMuted={!isAudioEnabled}
              isVideoOff={!isVideoEnabled}
              compact
            />
          </div>

          {/* Remote participants thumbnails */}
          {remoteArray.map((remote) => (
            <div key={remote.socketId} className="w-40 lg:w-full shrink-0">
              <VideoTile
                stream={remote.stream}
                username={remote.username}
                compact
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

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