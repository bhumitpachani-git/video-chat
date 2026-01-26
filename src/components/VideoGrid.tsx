import { useRef, useEffect, useMemo } from 'react';
import { VideoTile } from './VideoTile';
import { RemoteStream, ScreenShareStream } from '@/lib/mediasoup';
import { cn } from '@/lib/utils';
import { Monitor, Users } from 'lucide-react';
import { useRemoteAudioLevels } from '@/hooks/useAudioProcessor';
import { LayoutMode } from './VideoCall';

interface ParticipantStatus {
  socketId: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

interface VideoGridProps {
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  remoteStreams: Map<string, RemoteStream>;
  screenShareStreams: Map<string, ScreenShareStream>;
  username: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  remoteParticipantStatus?: Map<string, ParticipantStatus>;
  layoutMode?: LayoutMode;
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
  remoteParticipantStatus,
  layoutMode = 'grid',
}: VideoGridProps) {
  const remoteArray = Array.from(remoteStreams.values());
  const screenShareArray = Array.from(screenShareStreams.values());
  const hasActiveScreenShare = isScreenSharing || screenShareArray.length > 0;
  const totalParticipants = remoteArray.length + 1;

  // Prepare streams for audio level detection
  const streamsForAudioDetection = useMemo(() => {
    const map = new Map<string, { stream: MediaStream; socketId: string }>();
    remoteStreams.forEach((remote, socketId) => {
      map.set(socketId, { stream: remote.stream, socketId });
    });
    return map;
  }, [remoteStreams]);

  // Get speaking states for all remote participants
  const speakingStates = useRemoteAudioLevels(streamsForAudioDetection);

  // Screen share video ref
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (screenVideoRef.current && localScreenStream) {
      screenVideoRef.current.srcObject = localScreenStream;
    }
  }, [localScreenStream]);

  // Determine grid layout based on participant count
  const getGridClass = () => {
    if (totalParticipants === 1) return 'grid-cols-1';
    if (totalParticipants === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    if (totalParticipants <= 6) return 'grid-cols-2 sm:grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  };

  // Get participant status
  const getParticipantStatus = (socketId: string) => {
    const status = remoteParticipantStatus?.get(socketId);
    const speaking = speakingStates.get(socketId);
    return {
      isMuted: status?.isMuted ?? false,
      isVideoOff: status?.isVideoOff ?? false,
      isSpeaking: speaking?.isSpeaking ?? false,
    };
  };

  // Screen share layout
  if (hasActiveScreenShare) {
    return (
      <div className="h-full w-full flex flex-col p-2 sm:p-4 pb-24 sm:pb-28 gap-2 sm:gap-4">
        {/* Screen share - main area */}
        <div className="flex-1 min-h-0 relative rounded-xl overflow-hidden bg-black">
          {isScreenSharing && localScreenStream ? (
            <>
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-medium">
                <Monitor className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">You are sharing</span>
                <span className="sm:hidden">Sharing</span>
              </div>
            </>
          ) : screenShareArray[0] ? (
            <>
              <video
                autoPlay
                playsInline
                ref={(el) => {
                  if (el && screenShareArray[0]?.stream) {
                    el.srcObject = screenShareArray[0].stream;
                  }
                }}
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-muted text-foreground text-xs sm:text-sm font-medium">
                <Monitor className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{screenShareArray[0].username}</span>
              </div>
            </>
          ) : null}
        </div>

        {/* Participants strip - horizontal scroll on mobile */}
        <div className="h-20 sm:h-28 shrink-0 flex gap-2 overflow-x-auto">
          <div className="w-28 sm:w-40 shrink-0">
            <VideoTile
              stream={localStream}
              username={username}
              isLocal
              isMuted={!isAudioEnabled}
              isVideoOff={!isVideoEnabled}
              compact
            />
          </div>
          {remoteArray.map((remote) => {
            const status = getParticipantStatus(remote.socketId);
            return (
              <div key={remote.socketId} className="w-28 sm:w-40 shrink-0">
                <VideoTile
                  stream={remote.stream}
                  username={remote.username}
                  isMuted={status.isMuted}
                  isVideoOff={status.isVideoOff}
                  isSpeaking={status.isSpeaking}
                  compact
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Speaker layout - main speaker with thumbnails
  if (layoutMode === 'speaker' && totalParticipants > 1) {
    const mainParticipant = remoteArray[0];
    const otherParticipants = remoteArray.slice(1);
    
    return (
      <div className="h-full w-full flex flex-col p-2 sm:p-4 pb-24 sm:pb-28 gap-2 sm:gap-3">
        {/* Participant count indicator */}
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card/80 backdrop-blur border border-border text-xs sm:text-sm">
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
          <span className="font-medium">{totalParticipants}</span>
        </div>

        {/* Main speaker */}
        <div className="flex-1 min-h-0">
          {mainParticipant ? (
            <VideoTile
              stream={mainParticipant.stream}
              username={mainParticipant.username}
              isMuted={getParticipantStatus(mainParticipant.socketId).isMuted}
              isVideoOff={getParticipantStatus(mainParticipant.socketId).isVideoOff}
              isSpeaking={getParticipantStatus(mainParticipant.socketId).isSpeaking}
            />
          ) : (
            <VideoTile
              stream={localStream}
              username={username}
              isLocal
              isMuted={!isAudioEnabled}
              isVideoOff={!isVideoEnabled}
            />
          )}
        </div>

        {/* Thumbnail strip */}
        <div className="h-20 sm:h-28 shrink-0 flex gap-2 overflow-x-auto">
          {/* Local video thumbnail */}
          <div className="w-28 sm:w-36 shrink-0">
            <VideoTile
              stream={localStream}
              username={username}
              isLocal
              isMuted={!isAudioEnabled}
              isVideoOff={!isVideoEnabled}
              compact
            />
          </div>
          
          {/* Other remote participants */}
          {otherParticipants.map((remote) => {
            const status = getParticipantStatus(remote.socketId);
            return (
              <div key={remote.socketId} className="w-28 sm:w-36 shrink-0">
                <VideoTile
                  stream={remote.stream}
                  username={remote.username}
                  isMuted={status.isMuted}
                  isVideoOff={status.isVideoOff}
                  isSpeaking={status.isSpeaking}
                  compact
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Normal grid layout
  return (
    <div className="h-full w-full p-2 sm:p-4 pb-24 sm:pb-28">
      {/* Participant count indicator */}
      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card/80 backdrop-blur border border-border text-xs sm:text-sm">
        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
        <span className="font-medium">{totalParticipants}</span>
      </div>

      <div className={cn(
        'h-full grid gap-2 sm:gap-3',
        getGridClass(),
        totalParticipants === 1 && 'max-w-2xl mx-auto'
      )}>
        {/* Local video */}
        <VideoTile
          stream={localStream}
          username={username}
          isLocal
          isMuted={!isAudioEnabled}
          isVideoOff={!isVideoEnabled}
        />

        {/* Remote participants */}
        {remoteArray.map((remote) => {
          const status = getParticipantStatus(remote.socketId);
          return (
            <VideoTile
              key={remote.socketId}
              stream={remote.stream}
              username={remote.username}
              isMuted={status.isMuted}
              isVideoOff={status.isVideoOff}
              isSpeaking={status.isSpeaking}
            />
          );
        })}
      </div>

      {/* Waiting state */}
      {remoteStreams.size === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-24">
          <div className="bg-card/80 backdrop-blur px-6 py-4 rounded-2xl border border-border shadow-lg">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-2.5 h-2.5 bg-primary rounded-full animate-ping absolute" />
                <div className="w-2.5 h-2.5 bg-primary rounded-full" />
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">
                Waiting for others to join...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}