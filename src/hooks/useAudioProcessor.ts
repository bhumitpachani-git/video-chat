import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioProcessorOptions {
  noiseSuppression?: boolean;
  echoCancellation?: boolean;
  autoGainControl?: boolean;
  speakingThreshold?: number;
}

interface ParticipantAudioState {
  isSpeaking: boolean;
  audioLevel: number;
}

export function useAudioProcessor(
  stream: MediaStream | null,
  options: AudioProcessorOptions = {}
) {
  const {
    noiseSuppression = true,
    echoCancellation = true,
    autoGainControl = true,
    speakingThreshold = 0.01,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const processAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate RMS (Root Mean Square) for more accurate audio level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += (dataArray[i] / 255) ** 2;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    
    setAudioLevel(rms);
    setIsSpeaking(rms > speakingThreshold);

    animationFrameRef.current = requestAnimationFrame(processAudio);
  }, [speakingThreshold]);

  useEffect(() => {
    if (!stream) {
      setIsSpeaking(false);
      setAudioLevel(0);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;

      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      processAudio();
    } catch (error) {
      console.error('Error setting up audio processor:', error);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, [stream, processAudio]);

  return { isSpeaking, audioLevel };
}

// Hook to track multiple remote participants' audio
export function useRemoteAudioLevels(
  streams: Map<string, { stream: MediaStream; socketId: string }>
) {
  const [speakingStates, setSpeakingStates] = useState<Map<string, ParticipantAudioState>>(new Map());
  const audioContextsRef = useRef<Map<string, AudioContext>>(new Map());
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  const processAllAudio = useCallback(() => {
    const newStates = new Map<string, ParticipantAudioState>();
    
    analysersRef.current.forEach((analyser, socketId) => {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += (dataArray[i] / 255) ** 2;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      
      newStates.set(socketId, {
        isSpeaking: rms > 0.01,
        audioLevel: rms,
      });
    });

    setSpeakingStates(newStates);
    animationFrameRef.current = requestAnimationFrame(processAllAudio);
  }, []);

  useEffect(() => {
    // Clean up old contexts
    audioContextsRef.current.forEach((ctx, socketId) => {
      if (!streams.has(socketId)) {
        ctx.close();
        audioContextsRef.current.delete(socketId);
        analysersRef.current.delete(socketId);
      }
    });

    // Set up new contexts
    streams.forEach((streamData, socketId) => {
      if (!audioContextsRef.current.has(socketId)) {
        try {
          const audioTracks = streamData.stream.getAudioTracks();
          if (audioTracks.length === 0) return;

          const ctx = new AudioContext();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;

          const source = ctx.createMediaStreamSource(streamData.stream);
          source.connect(analyser);

          audioContextsRef.current.set(socketId, ctx);
          analysersRef.current.set(socketId, analyser);
        } catch (error) {
          console.error('Error setting up remote audio analyser:', error);
        }
      }
    });

    if (streams.size > 0) {
      processAllAudio();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [streams, processAllAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioContextsRef.current.forEach(ctx => ctx.close());
      audioContextsRef.current.clear();
      analysersRef.current.clear();
    };
  }, []);

  return speakingStates;
}

// Enhanced audio constraints for noise cancellation
export const getEnhancedAudioConstraints = () => ({
  echoCancellation: { ideal: true },
  noiseSuppression: { ideal: true },
  autoGainControl: { ideal: true },
  // Advanced constraints for better noise reduction
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 48000 },
  sampleSize: { ideal: 16 },
});
