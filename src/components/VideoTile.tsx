import React, { useRef, useEffect, useState } from 'react';
import { User, Mic, MicOff, VideoOff } from 'lucide-react';
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

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-video-bg border border-video-border rounded-xl h-full w-full',
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
          isLocal && 'transform -scale-x-100'
        )}
      />

      {/* Placeholder when no video */}
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-10 h-10 md:w-12 md:h-12 text-primary" />
          </div>
        </div>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

      {/* Username and status */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
        <div className="glass-effect px-3 py-1.5 rounded-full flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
            {isLocal ? `${username} (You)` : username}
          </span>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-1.5">
          {isMuted && (
            <div className="glass-effect p-1.5 rounded-full">
              <MicOff className="w-4 h-4 text-destructive" />
            </div>
          )}
          {isVideoOff && (
            <div className="glass-effect p-1.5 rounded-full">
              <VideoOff className="w-4 h-4 text-destructive" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
