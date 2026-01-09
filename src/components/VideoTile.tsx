import React, { useEffect, useRef, useState } from 'react';
import { MicOff, VideoOff, User, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoTileProps {
  stream: MediaStream | null;
  username: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  className?: string;
}

export function VideoTile({
  stream,
  username,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
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
  const getAvatarGradient = () => {
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 70%, 40%))`;
  };

  return (
    <div className={cn(
      'relative aspect-video rounded-2xl overflow-hidden',
      'bg-gradient-to-br from-secondary via-secondary/80 to-muted',
      'border border-border/50 shadow-xl',
      'transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-primary/10',
      isLocal && 'ring-2 ring-primary/20',
      className
    )}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
          showVideo ? 'opacity-100' : 'opacity-0',
          isLocal && 'transform scale-x-[-1]'
        )}
      />

      {/* Avatar placeholder when no video */}
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary via-secondary/80 to-muted">
          <div 
            className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-2xl"
            style={{ background: getAvatarGradient() }}
          >
            <span className="text-white text-2xl md:text-3xl font-bold uppercase">
              {username.charAt(0)}
            </span>
          </div>
        </div>
      )}

      {/* Top gradient overlay */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
      
      {/* Bottom gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-none" />

      {/* Local indicator */}
      {isLocal && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/90 backdrop-blur-sm">
          <Pin className="w-3 h-3 text-primary-foreground" />
          <span className="text-xs font-medium text-primary-foreground">You</span>
        </div>
      )}

      {/* Status indicators - top right */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {isMuted && (
          <div className="w-8 h-8 rounded-full bg-destructive/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <MicOff className="w-4 h-4 text-destructive-foreground" />
          </div>
        )}
        {isVideoOff && (
          <div className="w-8 h-8 rounded-full bg-destructive/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <VideoOff className="w-4 h-4 text-destructive-foreground" />
          </div>
        )}
      </div>

      {/* Username - bottom left */}
      <div className="absolute bottom-3 left-3 right-3">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-md">
            <span className="text-sm font-medium text-white truncate">
              {isLocal ? `${username} (You)` : username}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
