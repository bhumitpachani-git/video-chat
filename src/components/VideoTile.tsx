import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParticipantMediaStatus } from '@/hooks/useAdvancedAudioProcessor';
import { useVideoSettings } from '@/contexts/VideoSettingsContext';

interface VideoTileProps {
  stream: MediaStream | null;
  username: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isSpeaking?: boolean;
  compact?: boolean;
  className?: string;
}

export function VideoTile({
  stream,
  username,
  isLocal = false,
  isMuted: propMuted,
  isVideoOff: propVideoOff,
  isSpeaking: externalIsSpeaking,
  compact = false,
  className,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [hasVideo, setHasVideo] = useState(false);
  const { settings: videoSettings } = useVideoSettings();
  const [backgroundImageLoaded, setBackgroundImageLoaded] = useState<HTMLImageElement | null>(null);
  
  const actualStatus = useParticipantMediaStatus(stream, isLocal);
  
  const isMuted = propMuted ?? actualStatus.isMuted;
  const isVideoOff = propVideoOff ?? actualStatus.isVideoOff;
  const isSpeaking = externalIsSpeaking ?? actualStatus.isSpeaking;
  const audioLevel = actualStatus.audioLevel;

  // Load background image when set
  useEffect(() => {
    if (videoSettings.backgroundImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setBackgroundImageLoaded(img);
      img.onerror = () => setBackgroundImageLoaded(null);
      img.src = videoSettings.backgroundImage;
    } else {
      setBackgroundImageLoaded(null);
    }
  }, [videoSettings.backgroundImage]);

  // Canvas rendering for blur/background effects
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Apply mirror transform if needed
    if (videoSettings.mirrorVideo) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-width, 0);
    }

    // Draw background first
    if (videoSettings.backgroundImage && backgroundImageLoaded) {
      // Draw the background image
      const imgRatio = backgroundImageLoaded.width / backgroundImageLoaded.height;
      const canvasRatio = width / height;
      let drawWidth, drawHeight, drawX, drawY;
      
      if (imgRatio > canvasRatio) {
        drawHeight = height;
        drawWidth = height * imgRatio;
        drawX = (width - drawWidth) / 2;
        drawY = 0;
      } else {
        drawWidth = width;
        drawHeight = width / imgRatio;
        drawX = 0;
        drawY = (height - drawHeight) / 2;
      }
      
      ctx.drawImage(backgroundImageLoaded, drawX, drawY, drawWidth, drawHeight);
      
      // Draw video with center mask effect (simulate person cutout)
      ctx.save();
      
      // Create an elliptical gradient mask for the "person" area
      const centerX = width / 2;
      const centerY = height / 2;
      const radiusX = width * 0.35;
      const radiusY = height * 0.45;
      
      // Create radial gradient for soft edge
      const gradient = ctx.createRadialGradient(
        centerX, centerY, Math.min(radiusX, radiusY) * 0.5,
        centerX, centerY, Math.max(radiusX, radiusY)
      );
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.7, 'rgba(255,255,255,0.9)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      
      // Draw video with gradient composite
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(video, 0, 0, width, height);
      
      ctx.restore();
    } else if (videoSettings.backgroundBlur) {
      // For blur effect: draw blurred video first, then sharp center
      // First pass: draw blurred background (simulated with scaled blur)
      ctx.filter = 'blur(20px)';
      ctx.drawImage(video, -20, -20, width + 40, height + 40);
      ctx.filter = 'none';
      
      // Second pass: draw sharp center area
      ctx.save();
      
      // Create elliptical clipping path for center focus
      const centerX = width / 2;
      const centerY = height / 2;
      const radiusX = width * 0.38;
      const radiusY = height * 0.48;
      
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.clip();
      
      // Draw sharp video in the center
      ctx.drawImage(video, 0, 0, width, height);
      
      ctx.restore();
      
      // Add soft edge transition
      const gradient = ctx.createRadialGradient(
        centerX, centerY, radiusX * 0.8,
        centerX, centerY, radiusX * 1.1
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } else {
      // No effects - just draw video
      ctx.drawImage(video, 0, 0, width, height);
    }

    if (videoSettings.mirrorVideo) {
      ctx.restore();
    }

    animationRef.current = requestAnimationFrame(renderFrame);
  }, [videoSettings.mirrorVideo, videoSettings.backgroundBlur, videoSettings.backgroundImage, backgroundImageLoaded]);

  // Start/stop canvas rendering based on settings
  useEffect(() => {
    const needsCanvasRendering = isLocal && (videoSettings.backgroundBlur || videoSettings.backgroundImage);
    
    if (needsCanvasRendering && stream && hasVideo) {
      animationRef.current = requestAnimationFrame(renderFrame);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isLocal, videoSettings.backgroundBlur, videoSettings.backgroundImage, stream, hasVideo, renderFrame]);

  // Update canvas size when container resizes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    });
    
    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !stream) {
      setHasVideo(false);
      return;
    }

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
  }, [stream]);

  useEffect(() => {
    if (stream && !isVideoOff) {
      const videoTracks = stream.getVideoTracks();
      setHasVideo(videoTracks.length > 0 && 
        videoTracks.some(track => track.readyState === 'live' && track.enabled));
    } else {
      setHasVideo(false);
    }
  }, [isVideoOff, stream]);

  const showVideo = stream && hasVideo && !isVideoOff;
  const useCanvasRendering = isLocal && (videoSettings.backgroundBlur || videoSettings.backgroundImage);

  const getAvatarColor = () => {
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 45%)`;
  };

  return (
    <div className={cn(
      'relative w-full h-full rounded-xl overflow-hidden bg-muted transition-all duration-200',
      compact ? 'min-h-[80px]' : 'min-h-[120px] sm:min-h-[180px]',
      isSpeaking && !isMuted && 'ring-2 ring-success ring-offset-2 ring-offset-background',
      isLocal && !isSpeaking && 'ring-2 ring-primary/40',
      className
    )}>
      {/* Hidden video element for canvas source */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          'absolute inset-0 w-full h-full object-cover',
          showVideo && !useCanvasRendering ? 'opacity-100' : 'opacity-0',
          !useCanvasRendering && isLocal && videoSettings.mirrorVideo && 'transform scale-x-[-1]'
        )}
        style={{ display: useCanvasRendering ? 'none' : 'block' }}
      />
      
      {/* Canvas for effects rendering */}
      {useCanvasRendering && showVideo && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
        />
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
