import { useState, useEffect, useRef, useCallback } from 'react';

interface NoiseProcessorOptions {
  noiseGateThreshold?: number;
  highpassFrequency?: number;
  lowpassFrequency?: number;
  compressionThreshold?: number;
}

interface AudioProcessorResult {
  isSpeaking: boolean;
  audioLevel: number;
  processedStream: MediaStream | null;
}

// Advanced audio processor with Web Audio API noise gate
export function useAdvancedAudioProcessor(
  stream: MediaStream | null,
  options: NoiseProcessorOptions = {}
): AudioProcessorResult {
  const {
    noiseGateThreshold = -50, // dB threshold for noise gate
    highpassFrequency = 80, // Cut low frequencies (background hum)
    lowpassFrequency = 12000, // Cut very high frequencies
    compressionThreshold = -24, // Compression threshold in dB
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const highpassRef = useRef<BiquadFilterNode | null>(null);
  const lowpassRef = useRef<BiquadFilterNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate RMS for more accurate audio level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += (dataArray[i] / 255) ** 2;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    
    // Noise gate: suppress very low levels
    const adjustedLevel = rms < 0.015 ? 0 : rms;
    setAudioLevel(adjustedLevel);

    // Speaking detection with hysteresis to prevent flickering
    if (adjustedLevel > 0.03) {
      setIsSpeaking(true);
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
        speakingTimeoutRef.current = null;
      }
    } else if (!speakingTimeoutRef.current) {
      speakingTimeoutRef.current = setTimeout(() => {
        setIsSpeaking(false);
        speakingTimeoutRef.current = null;
      }, 300); // 300ms delay before marking as not speaking
    }

    animationFrameRef.current = requestAnimationFrame(processAudio);
  }, []);

  useEffect(() => {
    if (!stream) {
      setIsSpeaking(false);
      setAudioLevel(0);
      setProcessedStream(null);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      // Create audio context and nodes
      audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;

      // Source from input stream
      const source = ctx.createMediaStreamSource(stream);

      // High-pass filter to remove low-frequency noise (hum, rumble)
      highpassRef.current = ctx.createBiquadFilter();
      highpassRef.current.type = 'highpass';
      highpassRef.current.frequency.value = highpassFrequency;
      highpassRef.current.Q.value = 0.7;

      // Low-pass filter to remove high-frequency noise
      lowpassRef.current = ctx.createBiquadFilter();
      lowpassRef.current.type = 'lowpass';
      lowpassRef.current.frequency.value = lowpassFrequency;
      lowpassRef.current.Q.value = 0.7;

      // Compressor for consistent volume and noise reduction
      compressorRef.current = ctx.createDynamicsCompressor();
      compressorRef.current.threshold.value = compressionThreshold;
      compressorRef.current.knee.value = 30;
      compressorRef.current.ratio.value = 12;
      compressorRef.current.attack.value = 0.003;
      compressorRef.current.release.value = 0.25;

      // Gain node for volume control
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.gain.value = 1.2; // Slight boost after compression

      // Analyser for level detection
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.85;

      // Destination for processed stream
      destinationRef.current = ctx.createMediaStreamDestination();

      // Connect the audio graph
      source
        .connect(highpassRef.current)
        .connect(lowpassRef.current)
        .connect(compressorRef.current)
        .connect(gainNodeRef.current)
        .connect(analyserRef.current)
        .connect(destinationRef.current);

      // Create new stream with processed audio and original video
      const videoTracks = stream.getVideoTracks();
      const newStream = new MediaStream([
        ...destinationRef.current.stream.getAudioTracks(),
        ...videoTracks,
      ]);
      setProcessedStream(newStream);

      // Start audio level monitoring
      processAudio();

    } catch (error) {
      console.error('Error setting up advanced audio processor:', error);
      setProcessedStream(stream); // Fallback to original stream
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, [stream, highpassFrequency, lowpassFrequency, compressionThreshold, processAudio]);

  return { isSpeaking, audioLevel, processedStream };
}

// Get user's browser/system language
export function getUserLanguage(): string {
  const browserLang = navigator.language || (navigator as any).userLanguage;
  if (browserLang) {
    const code = browserLang.split('-')[0].toLowerCase();
    const supportedCodes = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar', 'hi', 'ru'];
    if (supportedCodes.includes(code)) {
      return code;
    }
  }
  return 'en'; // Default to English
}

// Enhanced participant status interface
export interface ParticipantMediaStatus {
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
  audioLevel: number;
}

// Hook to track actual media status from streams
export function useParticipantMediaStatus(
  stream: MediaStream | null,
  isLocal: boolean = false
): ParticipantMediaStatus {
  const [status, setStatus] = useState<ParticipantMediaStatus>({
    isMuted: false, // Default to not muted until we know
    isVideoOff: false, // Default to video on until we know
    isSpeaking: false,
    audioLevel: 0,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!stream) {
      setStatus({
        isMuted: true,
        isVideoOff: true,
        isSpeaking: false,
        audioLevel: 0,
      });
      return;
    }

    const checkMediaStatus = () => {
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      
      // Check if tracks exist and are enabled
      const hasActiveAudio = audioTracks.length > 0 && audioTracks.some(track => 
        track.readyState === 'live' && track.enabled
      );
      const hasActiveVideo = videoTracks.length > 0 && videoTracks.some(track => 
        track.readyState === 'live' && track.enabled
      );

      console.log('[MediaStatus] Check for stream - audio:', hasActiveAudio, 'video:', hasActiveVideo, 'audioTracks:', audioTracks.length, 'videoTracks:', videoTracks.length);

      setStatus(prev => ({
        ...prev,
        isMuted: !hasActiveAudio,
        isVideoOff: !hasActiveVideo,
      }));
    };

    // Initial check
    checkMediaStatus();

    // Listen for track changes
    const handleTrackChange = () => {
      checkMediaStatus();
    };

    stream.addEventListener('addtrack', handleTrackChange);
    stream.addEventListener('removetrack', handleTrackChange);

    // Listen for track enabled/disabled changes
    stream.getTracks().forEach(track => {
      track.addEventListener('ended', handleTrackChange);
      track.addEventListener('mute', handleTrackChange);
      track.addEventListener('unmute', handleTrackChange);
    });

    // Setup audio level monitoring
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      try {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.85;

        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        const processAudio = () => {
          if (!analyserRef.current) return;

          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += (dataArray[i] / 255) ** 2;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const adjustedLevel = rms < 0.015 ? 0 : rms;

          // Speaking detection with hysteresis
          if (adjustedLevel > 0.03) {
            setStatus(prev => ({ ...prev, isSpeaking: true, audioLevel: adjustedLevel }));
            if (speakingTimeoutRef.current) {
              clearTimeout(speakingTimeoutRef.current);
              speakingTimeoutRef.current = null;
            }
          } else {
            setStatus(prev => ({ ...prev, audioLevel: adjustedLevel }));
            if (!speakingTimeoutRef.current) {
              speakingTimeoutRef.current = setTimeout(() => {
                setStatus(prev => ({ ...prev, isSpeaking: false }));
                speakingTimeoutRef.current = null;
              }, 300);
            }
          }

          animationFrameRef.current = requestAnimationFrame(processAudio);
        };

        processAudio();
      } catch (error) {
        console.error('Error setting up audio monitoring:', error);
      }
    }

    // Poll for track state changes every 500ms
    const pollInterval = setInterval(checkMediaStatus, 500);

    return () => {
      clearInterval(pollInterval);
      stream.removeEventListener('addtrack', handleTrackChange);
      stream.removeEventListener('removetrack', handleTrackChange);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, [stream]);

  return status;
}
