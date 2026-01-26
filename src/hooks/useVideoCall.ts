import { useState, useCallback, useRef, useEffect } from 'react';
import { MediaSoupClient, RemoteStream, Peer, ChatMessage, ScreenShareStream, Poll, WhiteboardStroke, WhiteboardState } from '@/lib/mediasoup';
import { TranscriptEntry } from '@/components/TranscriptionPanel';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'in-call' | 'error';

export interface PresentingState {
  type: 'whiteboard' | 'notes' | null;
  socketId: string;
  username: string;
}

export interface UseVideoCallReturn {
  connectionState: ConnectionState;
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  remoteStreams: Map<string, RemoteStream>;
  screenShareStreams: Map<string, ScreenShareStream>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  transcripts: TranscriptEntry[];
  selectedLanguage: string;
  error: string | null;
  roomId: string;
  username: string;
  socketId: string | undefined;
  chatMessages: ChatMessage[];
  polls: Poll[];
  whiteboardStrokes: WhiteboardStroke[];
  sharedNotes: string;
  presentingState: PresentingState | null;
  activePoll: Poll | null;
  joinRoom: (roomId: string, username: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  toggleVideo: () => void;
  toggleAudio: () => void;
  toggleScreenShare: () => Promise<void>;
  toggleRecording: () => void;
  toggleTranscription: () => void;
  setSelectedLanguage: (language: string) => void;
  sendChatMessage: (message: string) => Promise<void>;
  createPoll: (question: string, options: string[], isAnonymous: boolean, allowMultiple: boolean) => void;
  submitVote: (pollId: string, selectedOptions: number[]) => void;
  closePoll: (pollId: string) => void;
  dismissActivePoll: () => void;
  sendWhiteboardStroke: (stroke: WhiteboardStroke) => void;
  clearWhiteboard: () => void;
  updateNotes: (notes: string) => void;
  presentWhiteboard: (isPresenting: boolean) => void;
  presentNotes: (isPresenting: boolean) => void;
  stopPresenting: () => void;
}

export function useVideoCall(): UseVideoCallReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, RemoteStream>>(new Map());
  const [screenShareStreams, setScreenShareStreams] = useState<Map<string, ScreenShareStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<WhiteboardStroke[]>([]);
  const [sharedNotes, setSharedNotes] = useState('');
  const [presentingState, setPresentingState] = useState<PresentingState | null>(null);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  
  const clientRef = useRef<MediaSoupClient | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  const joinRoom = useCallback(async (roomId: string, username: string) => {
    try {
      setError(null);
      setConnectionState('connecting');
      setRoomId(roomId);
      setUsername(username);
      setChatMessages([]);

      // Create new client
      const client = new MediaSoupClient();
      clientRef.current = client;

      // Set up callbacks
      client.onLocalStream = (stream) => {
        console.log('[Hook] Local stream received');
        setLocalStream(stream);
      };

      client.onRemoteStream = (streams) => {
        console.log('[Hook] Remote streams updated:', streams.size);
        setRemoteStreams(new Map(streams));
      };
      
      client.onScreenShareStream = (streams) => {
        console.log('[Hook] Screen share streams updated:', streams.size);
        setScreenShareStreams(new Map(streams));
      };

      client.onPeerJoined = (peer: Peer) => {
        console.log('[Hook] Peer joined:', peer.username);
      };

      client.onPeerLeft = (socketId: string) => {
        console.log('[Hook] Peer left:', socketId);
      };

      client.onConnectionStateChange = (state) => {
        console.log('[Hook] Connection state:', state);
        if (state === 'disconnected') {
          setConnectionState('disconnected');
        }
      };

      client.onError = (err) => {
        console.error('[Hook] Error:', err);
        setError(err);
        setConnectionState('error');
      };

      client.onScreenShareChange = (sharing) => {
        console.log('[Hook] Screen share changed:', sharing);
        setIsScreenSharing(sharing);
        if (!sharing) {
          setLocalScreenStream(null);
        }
      };

      client.onChatMessage = (message) => {
        console.log('[Hook] Chat message:', message);
        setChatMessages(prev => [...prev, message]);
      };

      // Handle transcription events
      client.onTranscription = (data: {
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
            const filtered = prev.filter(
              t => !(t.socketId === data.socketId && !t.isFinal)
            );
            return [...filtered, { ...data, timestamp: new Date(data.timestamp) }];
          }
          return [...prev, { ...data, timestamp: new Date(data.timestamp) }];
        });
      };

      // Handle recording events
      client.onRecordingStarted = (data) => {
        console.log('[Hook] Recording started:', data);
        setIsRecording(true);
      };

      client.onRecordingStopped = (data) => {
        console.log('[Hook] Recording stopped:', data);
        setIsRecording(false);
      };

      // Handle poll events - show modal for new polls
      client.onNewPoll = (poll) => {
        console.log('[Hook] New poll:', poll.question);
        setPolls(prev => [...prev, poll]);
        // Show modal for new active poll
        setActivePoll(poll);
      };

      client.onPollUpdated = (data) => {
        console.log('[Hook] Poll updated:', data.pollId);
        setPolls(prev => prev.map(p => 
          p.id === data.pollId 
            ? { ...p, results: data.results, totalVotes: data.totalVotes }
            : p
        ));
        // Update active poll if it's the one being updated
        setActivePoll(prev => prev?.id === data.pollId 
          ? { ...prev, results: data.results, totalVotes: data.totalVotes }
          : prev
        );
      };

      client.onPollClosed = (data) => {
        console.log('[Hook] Poll closed:', data.pollId);
        setPolls(prev => prev.map(p => 
          p.id === data.pollId 
            ? { ...p, results: data.finalResults, totalVotes: data.totalVotes, active: false }
            : p
        ));
        // Close modal if this poll was active
        setActivePoll(prev => prev?.id === data.pollId ? null : prev);
      };

      client.onPollsSync = (existingPolls) => {
        console.log('[Hook] Polls synced:', existingPolls.length);
        setPolls(existingPolls);
      };

      // Handle whiteboard events
      client.onWhiteboardStroke = (stroke) => {
        console.log('[Hook] Whiteboard stroke received');
        setWhiteboardStrokes(prev => [...prev, stroke]);
      };

      client.onWhiteboardClear = () => {
        console.log('[Hook] Whiteboard cleared');
        setWhiteboardStrokes([]);
      };

      client.onWhiteboardUndo = () => {
        console.log('[Hook] Whiteboard undo');
        setWhiteboardStrokes(prev => prev.slice(0, -1));
      };

      client.onWhiteboardSync = (state) => {
        console.log('[Hook] Whiteboard synced');
        setWhiteboardStrokes(state.strokes);
      };

      // Handle whiteboard present event - show fullscreen for all
      client.onWhiteboardPresent = (data) => {
        console.log('[Hook] Whiteboard present:', data);
        if (data.isPresenting) {
          setPresentingState({
            type: 'whiteboard',
            socketId: data.socketId,
            username: data.username,
          });
        } else {
          setPresentingState(prev => 
            prev?.type === 'whiteboard' && prev.socketId === data.socketId ? null : prev
          );
        }
      };

      // Handle notes events
      client.onNotesUpdated = (notes) => {
        console.log('[Hook] Notes updated');
        setSharedNotes(notes);
      };

      // Handle notes present event - show fullscreen for all
      client.onNotesPresent = (data) => {
        console.log('[Hook] Notes present:', data);
        if (data.isPresenting) {
          setPresentingState({
            type: 'notes',
            socketId: data.socketId,
            username: data.username,
          });
        } else {
          setPresentingState(prev => 
            prev?.type === 'notes' && prev.socketId === data.socketId ? null : prev
          );
        }
      };

      // Connect to server
      await client.connect();
      setConnectionState('connected');

      // Join room
      const peers = await client.joinRoom(roomId, username);
      console.log('[Hook] Joined room with peers:', peers);

      // Create transports
      await client.createTransports();

      // Start producing local media
      await client.startProducing();

      // Consume existing producers
      await client.consumeExistingProducers();

      setConnectionState('in-call');
      console.log('[Hook] Successfully joined call');
    } catch (err) {
      console.error('[Hook] Error joining room:', err);
      setError(err instanceof Error ? err.message : 'Failed to join room');
      setConnectionState('error');
      
      if (clientRef.current) {
        await clientRef.current.disconnect();
        clientRef.current = null;
      }
    }
  }, []);

  const leaveRoom = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.disconnect();
      clientRef.current = null;
    }
    setLocalStream(null);
    setLocalScreenStream(null);
    setRemoteStreams(new Map());
    setScreenShareStreams(new Map());
    setConnectionState('disconnected');
    setRoomId('');
    setUsername('');
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsScreenSharing(false);
    setIsRecording(false);
    setIsTranscribing(false);
    setTranscripts([]);
    setChatMessages([]);
    setPolls([]);
    setWhiteboardStrokes([]);
    setSharedNotes('');
    
    // Stop transcription audio processing
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
  }, []);

  const toggleVideo = useCallback(() => {
    if (clientRef.current) {
      const enabled = clientRef.current.toggleVideo();
      setIsVideoEnabled(enabled);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (clientRef.current) {
      const enabled = clientRef.current.toggleAudio();
      setIsAudioEnabled(enabled);
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!clientRef.current) return;

    if (clientRef.current.isScreenSharing()) {
      await clientRef.current.stopScreenShare();
      setLocalScreenStream(null);
    } else {
      const screenStream = await clientRef.current.startScreenShare();
      if (screenStream) {
        setLocalScreenStream(screenStream);
      }
    }
  }, []);

  const toggleTranscription = useCallback(() => {
    if (!clientRef.current || !localStream) return;

    if (isTranscribing) {
      // Stop transcription
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
      clientRef.current.stopTranscription();
      setIsTranscribing(false);
    } else {
      // Start transcription
      try {
        const audioTrack = localStream.getAudioTracks()[0];
        if (!audioTrack) {
          console.error('No audio track available');
          return;
        }

        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
        const audioStream = new MediaStream([audioTrack]);
        sourceRef.current = audioContextRef.current.createMediaStreamSource(audioStream);
        processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

        processorRef.current.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          clientRef.current?.sendAudioChunk(Array.from(int16Data));
        };

        sourceRef.current.connect(processorRef.current);
        processorRef.current.connect(audioContextRef.current.destination);

        clientRef.current.startTranscription(selectedLanguage);
        setIsTranscribing(true);
      } catch (error) {
        console.error('Failed to start transcription:', error);
      }
    }
  }, [isTranscribing, localStream, selectedLanguage]);

  const toggleRecording = useCallback(() => {
    if (!clientRef.current) return;

    if (isRecording) {
      clientRef.current.stopRecording();
      setIsRecording(false);
    } else {
      clientRef.current.startRecording();
      setIsRecording(true);
    }
  }, [isRecording]);

  const sendChatMessage = useCallback(async (message: string) => {
    if (clientRef.current && message.trim()) {
      await clientRef.current.sendChatMessage(message.trim());
    }
  }, []);

  // Update target language on server when changed
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    if (clientRef.current) {
      clientRef.current.setTargetLanguage(language);
    }
  };

  // Poll handlers
  const createPoll = useCallback((question: string, options: string[], isAnonymous: boolean, allowMultiple: boolean) => {
    if (clientRef.current) {
      clientRef.current.createPoll(question, options, isAnonymous, allowMultiple);
    }
  }, []);

  const submitVote = useCallback((pollId: string, selectedOptions: number[]) => {
    if (clientRef.current) {
      clientRef.current.submitVote(pollId, selectedOptions);
    }
  }, []);

  const closePoll = useCallback((pollId: string) => {
    if (clientRef.current) {
      clientRef.current.closePoll(pollId);
    }
  }, []);

  // Whiteboard handlers
  const sendWhiteboardStroke = useCallback((stroke: WhiteboardStroke) => {
    if (clientRef.current) {
      setWhiteboardStrokes(prev => [...prev, stroke]);
      clientRef.current.sendWhiteboardStroke(stroke);
    }
  }, []);

  const clearWhiteboard = useCallback(() => {
    if (clientRef.current) {
      setWhiteboardStrokes([]);
      clientRef.current.clearWhiteboard();
    }
  }, []);

  // Notes handler
  const updateNotes = useCallback((notes: string) => {
    if (clientRef.current) {
      setSharedNotes(notes);
      clientRef.current.updateNotes(notes);
    }
  }, []);

  // Presenting handlers
  const presentWhiteboard = useCallback((isPresenting: boolean) => {
    if (clientRef.current) {
      clientRef.current.presentWhiteboard(isPresenting);
      if (isPresenting) {
        setPresentingState({
          type: 'whiteboard',
          socketId: clientRef.current.getSocketId() || '',
          username,
        });
      } else {
        setPresentingState(null);
      }
    }
  }, [username]);

  const presentNotes = useCallback((isPresenting: boolean) => {
    if (clientRef.current) {
      clientRef.current.presentNotes(isPresenting);
      if (isPresenting) {
        setPresentingState({
          type: 'notes',
          socketId: clientRef.current.getSocketId() || '',
          username,
        });
      } else {
        setPresentingState(null);
      }
    }
  }, [username]);

  const stopPresenting = useCallback(() => {
    if (presentingState?.type === 'whiteboard') {
      presentWhiteboard(false);
    } else if (presentingState?.type === 'notes') {
      presentNotes(false);
    }
    setPresentingState(null);
  }, [presentingState, presentWhiteboard, presentNotes]);

  const dismissActivePoll = useCallback(() => {
    setActivePoll(null);
  }, []);

  return {
    connectionState,
    localStream,
    localScreenStream,
    remoteStreams,
    screenShareStreams,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    isRecording,
    isTranscribing,
    transcripts,
    selectedLanguage,
    error,
    roomId,
    username,
    socketId: clientRef.current?.getSocketId(),
    chatMessages,
    polls,
    whiteboardStrokes,
    sharedNotes,
    presentingState,
    activePoll,
    joinRoom,
    leaveRoom,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    toggleRecording,
    toggleTranscription,
    setSelectedLanguage: handleLanguageChange,
    sendChatMessage,
    createPoll,
    submitVote,
    closePoll,
    dismissActivePoll,
    sendWhiteboardStroke,
    clearWhiteboard,
    updateNotes,
    presentWhiteboard,
    presentNotes,
    stopPresenting,
  };
}
