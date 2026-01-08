import React, { useRef, useEffect, useState } from 'react';
import { User, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoTileProps {
  stream: MediaStream | null;
  username: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  className?: string;
  isSmall?: boolean;
}

export function VideoTile({
  stream,
  username,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  className,
  isSmall = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      
      // Check if stream has video tracks
      const videoTracks = stream.getVideoTracks();
      setHasVideo(videoTracks.length > 0 && videoTracks.some(track => track.enabled));

      // Listen for track changes
      const handleTrackChange = () => {
        const tracks = stream.getVideoTracks();
        setHasVideo(tracks.length > 0 && tracks.some(track => track.enabled));
      };

      stream.addEventListener('addtrack', handleTrackChange);
      stream.addEventListener('removetrack', handleTrackChange);

      return () => {
        stream.removeEventListener('addtrack', handleTrackChange);
        stream.removeEventListener('removetrack', handleTrackChange);
      };
    }
  }, [stream]);

  const showVideo = stream && hasVideo && !isVideoOff;

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-video-bg border border-video-border transition-all duration-300',
        isSmall ? 'rounded-lg' : 'rounded-xl',
        'aspect-video',
        className
      )}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
          showVideo ? 'opacity-100' : 'opacity-0',
          isLocal && 'transform -scale-x-100' // Mirror local video
        )}
      />

      {/* Placeholder when no video */}
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
          <div className={cn(
            'rounded-full bg-primary/20 flex items-center justify-center',
            isSmall ? 'w-16 h-16' : 'w-24 h-24'
          )}>
            <User className={cn('text-primary', isSmall ? 'w-8 h-8' : 'w-12 h-12')} />
          </div>
        </div>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

      {/* Username badge */}
      <div className={cn(
        'absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between',
        isSmall ? 'p-1.5' : 'p-3'
      )}>
        <div className={cn(
          'glass-effect px-3 py-1.5 rounded-full flex items-center gap-2',
          isSmall && 'px-2 py-1'
        )}>
          <span className={cn(
            'font-medium text-foreground truncate max-w-[120px]',
            isSmall ? 'text-xs' : 'text-sm'
          )}>
            {isLocal ? `${username} (You)` : username}
          </span>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-1.5">
          {isMuted && (
            <div className="glass-effect p-1.5 rounded-full">
              <MicOff className={cn('text-destructive', isSmall ? 'w-3 h-3' : 'w-4 h-4')} />
            </div>
          )}
          {isVideoOff && (
            <div className="glass-effect p-1.5 rounded-full">
              <VideoOff className={cn('text-destructive', isSmall ? 'w-3 h-3' : 'w-4 h-4')} />
            </div>
          )}
        </div>
      </div>

      {/* Speaking indicator ring */}
      {isLocal && (
        <div className="absolute inset-0 border-2 border-primary/0 rounded-xl transition-colors duration-200" />
      )}
    </div>
  );
}
