import React, { useEffect, useRef, useState } from 'react';
import { MicOff, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoTileProps {
  stream: MediaStream | null;
  username: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  compact?: boolean;
  className?: string;
}

export function VideoTile({
  stream,
  username,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  compact = false,
  className,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !stream) {
      setHasVideo(false);
      return;
    }

    videoElement.srcObject = stream;
    
    const checkVideoTracks = () => {
      const videoTracks = stream.getVideoTracks();
      const hasActiveVideo = videoTracks.length > 0 && videoTracks.some(track => track.readyState === 'live');
      setHasVideo(hasActiveVideo);
    };

    checkVideoTracks();

    const playVideo = async () => {
      try {
        await videoElement.play();
      } catch {
        videoElement.muted = true;
        try {
          await videoElement.play();
        } catch (e) {
          console.error('Video play error:', e);
        }
      }
    };

    playVideo();

    stream.addEventListener('addtrack', checkVideoTracks);
    stream.addEventListener('removetrack', checkVideoTracks);

    return () => {
      stream.removeEventListener('addtrack', checkVideoTracks);
      stream.removeEventListener('removetrack', checkVideoTracks);
    };
  }, [stream]);

  useEffect(() => {
    if (stream && !isVideoOff) {
      const videoTracks = stream.getVideoTracks();
      setHasVideo(videoTracks.length > 0 && videoTracks.some(track => track.readyState === 'live'));
    }
  }, [isVideoOff, stream]);

  const showVideo = stream && hasVideo && !isVideoOff;

  // Generate avatar color from username
  const getAvatarColor = () => {
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 45%)`;
  };

  return (
    <div className={cn(
      'relative w-full h-full rounded-xl overflow-hidden bg-muted',
      compact ? 'min-h-[80px]' : 'min-h-[120px] sm:min-h-[180px]',
      isLocal && 'ring-2 ring-primary/40',
      className
    )}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          'absolute inset-0 w-full h-full object-cover',
          showVideo ? 'opacity-100' : 'opacity-0',
          isLocal && 'transform scale-x-[-1]'
        )}
      />

      {/* Avatar placeholder when no video */}
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div 
            className={cn(
              "rounded-full flex items-center justify-center",
              compact ? "w-10 h-10 sm:w-12 sm:h-12" : "w-16 h-16 sm:w-20 sm:h-20"
            )}
            style={{ backgroundColor: getAvatarColor() }}
          >
            <span className={cn(
              "text-white font-semibold uppercase",
              compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl"
            )}>
              {username.charAt(0)}
            </span>
          </div>
        </div>
      )}

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      {/* Status indicators */}
      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex items-center gap-1">
        {isMuted && (
          <div className={cn(
            "rounded-full bg-destructive flex items-center justify-center",
            compact ? "w-5 h-5" : "w-6 h-6 sm:w-7 sm:h-7"
          )}>
            <MicOff className={compact ? "w-3 h-3" : "w-3.5 h-3.5 sm:w-4 sm:h-4"} />
          </div>
        )}
        {isVideoOff && (
          <div className={cn(
            "rounded-full bg-destructive flex items-center justify-center",
            compact ? "w-5 h-5" : "w-6 h-6 sm:w-7 sm:h-7"
          )}>
            <VideoOff className={compact ? "w-3 h-3" : "w-3.5 h-3.5 sm:w-4 sm:h-4"} />
          </div>
        )}
      </div>

      {/* Username */}
      <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 right-1.5 sm:right-2">
        <span className={cn(
          "inline-block px-2 py-0.5 rounded bg-black/50 text-white truncate max-w-full",
          compact ? "text-xs" : "text-xs sm:text-sm"
        )}>
          {isLocal ? 'You' : username}
        </span>
      </div>
    </div>
  );
}