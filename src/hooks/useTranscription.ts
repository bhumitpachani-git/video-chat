import { useState, useRef, useCallback, useEffect } from 'react';
import { TranscriptEntry } from '@/components/TranscriptionPanel';
import { Socket } from 'socket.io-client';

interface UseTranscriptionProps {
  socket: Socket | null;
  localStream: MediaStream | null;
  username: string;
  roomId: string;
  targetLanguage: string;
}

export function useTranscription({
  socket,
  localStream,
  username,
  roomId,
  targetLanguage,
}: UseTranscriptionProps) {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Listen for transcription events from server
  useEffect(() => {
    if (!socket) return;

    const handleTranscription = (data: {
      id: string;
      socketId: string;
      username: string;
      originalText: string;
      translatedText?: string;
      originalLanguage: string;
      timestamp: string;
      isFinal: boolean;
    }) => {
      setTranscripts(prev => {
        // If not final, update existing interim transcript
        if (!data.isFinal) {
          const existingIndex = prev.findIndex(
            t => t.socketId === data.socketId && !t.isFinal
          );
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...data,
              timestamp: new Date(data.timestamp),
            };
            return updated;
          }
        } else {
          // Remove any interim transcript from this user
          const filtered = prev.filter(
            t => !(t.socketId === data.socketId && !t.isFinal)
          );
          return [...filtered, { ...data, timestamp: new Date(data.timestamp) }];
        }
        return [...prev, { ...data, timestamp: new Date(data.timestamp) }];
      });
    };

    socket.on('transcription', handleTranscription);

    return () => {
      socket.off('transcription', handleTranscription);
    };
  }, [socket]);

  // Request translation when target language changes
  useEffect(() => {
    if (socket && targetLanguage) {
      socket.emit('set-target-language', { roomId, targetLanguage });
    }
  }, [socket, targetLanguage, roomId]);

  const startTranscription = useCallback(() => {
    if (!localStream || !socket || isTranscribing) return;

    try {
      const audioTrack = localStream.getAudioTracks()[0];
      if (!audioTrack) {
        console.error('No audio track available');
        return;
      }

      // Create audio context for processing
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const audioStream = new MediaStream([audioTrack]);
      sourceRef.current = audioContextRef.current.createMediaStreamSource(audioStream);
      
      // Create processor for sending audio chunks
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32Array to Int16Array for AWS Transcribe
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }
        
        // Send audio chunk to server
        socket.emit('audio-chunk', {
          roomId,
          username,
          audioData: Array.from(int16Data),
        });
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      socket.emit('start-transcription', { roomId, username });
      setIsTranscribing(true);
    } catch (error) {
      console.error('Failed to start transcription:', error);
    }
  }, [localStream, socket, isTranscribing, roomId, username]);

  const stopTranscription = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (socket) {
      socket.emit('stop-transcription', { roomId });
    }
    setIsTranscribing(false);
  }, [socket, roomId]);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  return {
    transcripts,
    isTranscribing,
    startTranscription,
    stopTranscription,
    clearTranscripts,
  };
}
