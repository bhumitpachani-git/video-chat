import { useState, useCallback, useRef, useEffect } from 'react';
import { MediaSoupClient, RemoteStream, Peer } from '@/lib/mediasoup';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'in-call' | 'error';

export interface UseVideoCallReturn {
  connectionState: ConnectionState;
  localStream: MediaStream | null;
  remoteStreams: Map<string, RemoteStream>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  error: string | null;
  roomId: string;
  username: string;
  socketId: string | undefined;
  joinRoom: (roomId: string, username: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  toggleVideo: () => void;
  toggleAudio: () => void;
}

export function useVideoCall(): UseVideoCallReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, RemoteStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  
  const clientRef = useRef<MediaSoupClient | null>(null);

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
    setRemoteStreams(new Map());
    setConnectionState('disconnected');
    setRoomId('');
    setUsername('');
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
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

  return {
    connectionState,
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    error,
    roomId,
    username,
    socketId: clientRef.current?.getSocketId(),
    joinRoom,
    leaveRoom,
    toggleVideo,
    toggleAudio,
  };
}
