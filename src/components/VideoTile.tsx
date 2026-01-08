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
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !stream) {
      console.log(`[VideoTile ${username}] No video element or stream`);
      setHasVideo(false);
      return;
    }

    console.log(`[VideoTile ${username}] Setting stream with tracks:`, stream.getTracks().map(t => ({ kind: t.kind, readyState: t.readyState, enabled: t.enabled })));
    
    // Set the stream
    videoElement.srcObject = stream;
    
    // Check video tracks
    const checkVideoTracks = () => {
      const videoTracks = stream.getVideoTracks();
      const hasActiveVideo = videoTracks.length > 0 && videoTracks.some(track => track.readyState === 'live');
      console.log(`[VideoTile ${username}] Video tracks check:`, { count: videoTracks.length, hasActiveVideo, tracks: videoTracks.map(t => ({ readyState: t.readyState, enabled: t.enabled })) });
      setHasVideo(hasActiveVideo);
    };

    checkVideoTracks();

    // Try to play the video
    const playVideo = async () => {
      try {
        await videoElement.play();
        setIsPlaying(true);
        console.log(`[VideoTile ${username}] Video playing successfully`);
      } catch (error) {
        console.error(`[VideoTile ${username}] Error playing video:`, error);
        // Try again with muted (autoplay policies)
        videoElement.muted = true;
        try {
          await videoElement.play();
          setIsPlaying(true);
          console.log(`[VideoTile ${username}] Video playing (muted fallback)`);
        } catch (e) {
          console.error(`[VideoTile ${username}] Still can't play:`, e);
        }
      }
    };

    playVideo();

    // Listen for track changes
    const handleTrackChange = () => {
      console.log(`[VideoTile ${username}] Track changed`);
      checkVideoTracks();
    };

    stream.addEventListener('addtrack', handleTrackChange);
    stream.addEventListener('removetrack', handleTrackChange);

    // Listen for video events
    const handleLoadedMetadata = () => {
      console.log(`[VideoTile ${username}] Video metadata loaded`);
      checkVideoTracks();
    };

    const handleCanPlay = () => {
      console.log(`[VideoTile ${username}] Video can play`);
      playVideo();
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('canplay', handleCanPlay);

    return () => {
      stream.removeEventListener('addtrack', handleTrackChange);
      stream.removeEventListener('removetrack', handleTrackChange);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('canplay', handleCanPlay);
    };
  }, [stream, username]);

  // Also check when isVideoOff changes
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

      {/* Debug info for remote streams */}
      {!isLocal && (
        <div className="absolute top-2 left-2 text-xs bg-black/50 px-2 py-1 rounded text-white">
          {stream ? `Tracks: ${stream.getTracks().length}` : 'No stream'}
          {isPlaying ? ' ▶️' : ' ⏸️'}
        </div>
      )}
    </div>
  );
}
