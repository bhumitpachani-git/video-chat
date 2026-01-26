import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParticipantMediaStatus } from '@/hooks/useAdvancedAudioProcessor';
import { useVideoSettings } from '@/contexts/VideoSettingsContext';
import { useVirtualBackground } from '@/hooks/useVirtualBackground';

interface VideoTileWithBackgroundProps {
  stream: MediaStream | null;
  username: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isSpeaking?: boolean;
  compact?: boolean;
  className?: string;
}

export function VideoTileWithBackground({
  stream,
  username,
  isLocal = false,
  isMuted: propMuted,
  isVideoOff: propVideoOff,
  isSpeaking: externalIsSpeaking,
  compact = false,
  className,
}: VideoTileWithBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const { settings: videoSettings } = useVideoSettings();
  
  const actualStatus = useParticipantMediaStatus(stream, isLocal);
  
  const isMuted = propMuted ?? actualStatus.isMuted;
  const isVideoOff = propVideoOff ?? actualStatus.isVideoOff;
  const isSpeaking = externalIsSpeaking ?? actualStatus.isSpeaking;
  const audioLevel = actualStatus.audioLevel;

  // Virtual background processing
  const needsVirtualBackground = isLocal && (videoSettings.backgroundBlur || videoSettings.backgroundImage !== null);
  
  const {
    canvasRef,
    isModelLoading,
    isModelReady,
    startProcessing,
    stopProcessing,
  } = useVirtualBackground({
    backgroundBlur: videoSettings.backgroundBlur,
    backgroundImage: videoSettings.backgroundImage,
    blurAmount: 15,
    edgeBlurAmount: 3,
  });

  // Set canvas size when container resizes
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      canvas.width = Math.min(rect.width, 640);
      canvas.height = Math.min(rect.height, 480);
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [canvasRef]);

  // Start/stop virtual background processing
  useEffect(() => {
    const video = videoRef.current;
    
    if (needsVirtualBackground && video && hasVideo && isModelReady) {
      startProcessing(video);
    } else {
      stopProcessing();
    }

    return () => stopProcessing();
  }, [needsVirtualBackground, hasVideo, isModelReady, startProcessing, stopProcessing]);

  // Set up video stream
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    
    if (!stream) {
      setHasVideo(false);
      videoElement.srcObject = null;
      return;
    }

    console.log('[VideoTile] Setting stream for', username);
    videoElement.srcObject = stream;
    
    const checkVideoTracks = () => {
      const videoTracks = stream.getVideoTracks();
      const hasActiveVideo = videoTracks.length > 0 && 
        videoTracks.some(track => track.readyState === 'live' && track.enabled);
      setHasVideo(hasActiveVideo);
    };

    checkVideoTracks();

    const playVideo = async () => {
      try {
        await videoElement.play();
      } catch (err) {
        videoElement.muted = true;
        try {
          await videoElement.play();
        } catch (e) {
          console.error('[VideoTile] Video play error:', e);
        }
      }
    };

    playVideo();

    stream.addEventListener('addtrack', checkVideoTracks);
    stream.addEventListener('removetrack', checkVideoTracks);

    stream.getVideoTracks().forEach(track => {
      track.addEventListener('mute', checkVideoTracks);
      track.addEventListener('unmute', checkVideoTracks);
    });

    return () => {
      stream.removeEventListener('addtrack', checkVideoTracks);
      stream.removeEventListener('removetrack', checkVideoTracks);
      stream.getVideoTracks().forEach(track => {
        track.removeEventListener('mute', checkVideoTracks);
        track.removeEventListener('unmute', checkVideoTracks);
      });
    };
  }, [stream, username]);

  const showVideo = stream && hasVideo;
  const showCanvas = needsVirtualBackground && isModelReady && showVideo;

  const getAvatarColor = () => {
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 45%)`;
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        'relative w-full h-full rounded-xl overflow-hidden bg-muted transition-all duration-200',
        compact ? 'min-h-[80px]' : 'min-h-[120px] sm:min-h-[180px]',
        isSpeaking && !isMuted && 'ring-2 ring-success ring-offset-2 ring-offset-background',
        isLocal && !isSpeaking && 'ring-2 ring-primary/40',
        className
      )}
    >
      {/* Hidden video element - source for processing */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          'absolute inset-0 w-full h-full object-cover',
          showCanvas ? 'opacity-0 pointer-events-none' : (showVideo ? 'opacity-100' : 'opacity-0'),
          !showCanvas && isLocal && videoSettings.mirrorVideo && 'transform scale-x-[-1]'
        )}
      />
      
      {/* Canvas for virtual background rendering */}
      {showCanvas && (
        <canvas
          ref={canvasRef}
          className={cn(
            "absolute inset-0 w-full h-full object-cover",
            isLocal && videoSettings.mirrorVideo && 'transform scale-x-[-1]'
          )}
        />
      )}

      {/* Loading indicator for model */}
      {needsVirtualBackground && isModelLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="text-xs text-white">Loading effects...</span>
          </div>
        </div>
      )}

      {/* Avatar placeholder when no video */}
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div 
            className={cn(
              "rounded-full flex items-center justify-center transition-all duration-200",
              compact ? "w-10 h-10 sm:w-12 sm:h-12" : "w-16 h-16 sm:w-20 sm:h-20",
              isSpeaking && !isMuted && "ring-4 ring-success ring-offset-2 ring-offset-muted"
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

      {/* Speaking audio wave animation */}
      {isSpeaking && !isMuted && (
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-20">
          <div className={cn(
            "flex items-center gap-0.5 px-1.5 py-1 rounded-full bg-success",
            compact ? "scale-75" : ""
          )}>
            <Volume2 className="w-3 h-3 text-success-foreground animate-pulse" />
            <div className="flex items-center gap-0.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-0.5 bg-success-foreground rounded-full animate-pulse"
                  style={{
                    height: `${Math.max(4, audioLevel * 100 * (i * 0.5))}px`,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Virtual background indicator */}
      {isLocal && (videoSettings.backgroundBlur || videoSettings.backgroundImage) && isModelReady && (
        <div className="absolute top-1.5 right-12 sm:top-2 sm:right-16 z-20">
          <div className="px-1.5 py-0.5 rounded-full bg-primary/80 text-primary-foreground text-[10px] font-medium">
            BG
          </div>
        </div>
      )}

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none z-10" />

      {/* Top right status indicators */}
      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex items-center gap-1 z-20">
        <div className={cn(
          "rounded-full flex items-center justify-center transition-colors",
          compact ? "w-5 h-5" : "w-6 h-6 sm:w-7 sm:h-7",
          isMuted ? "bg-destructive" : "bg-success/90"
        )}>
          {isMuted ? (
            <MicOff className={cn("text-destructive-foreground", compact ? "w-3 h-3" : "w-3.5 h-3.5 sm:w-4 sm:h-4")} />
          ) : (
            <Mic className={cn("text-success-foreground", compact ? "w-3 h-3" : "w-3.5 h-3.5 sm:w-4 sm:h-4")} />
          )}
        </div>
        
        <div className={cn(
          "rounded-full flex items-center justify-center transition-colors",
          compact ? "w-5 h-5" : "w-6 h-6 sm:w-7 sm:h-7",
          isVideoOff ? "bg-destructive" : "bg-success/90"
        )}>
          {isVideoOff ? (
            <VideoOff className={cn("text-destructive-foreground", compact ? "w-3 h-3" : "w-3.5 h-3.5 sm:w-4 sm:h-4")} />
          ) : (
            <Video className={cn("text-success-foreground", compact ? "w-3 h-3" : "w-3.5 h-3.5 sm:w-4 sm:h-4")} />
          )}
        </div>
      </div>

      {/* Username with speaking indicator */}
      <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 right-1.5 sm:right-2 flex items-center gap-2 z-20">
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 text-white truncate max-w-full",
          compact ? "text-xs" : "text-xs sm:text-sm"
        )}>
          {isSpeaking && !isMuted && (
            <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
          )}
          {isLocal ? 'You' : username}
        </span>
      </div>
    </div>
  );
}
