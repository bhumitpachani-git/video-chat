import { io, Socket } from 'socket.io-client';
import { Device, types } from 'mediasoup-client';

type Transport = types.Transport;
type Producer = types.Producer;
type Consumer = types.Consumer;

const SERVER_URL = 'https://video-server-2261.onrender.com';

export interface Peer {
  socketId: string;
  username: string;
}

export interface ProducerInfo {
  socketId: string;
  producerId: string;
  kind: 'audio' | 'video';
}

export interface RemoteStream {
  socketId: string;
  username: string;
  stream: MediaStream;
  videoConsumer?: Consumer;
  audioConsumer?: Consumer;
  isScreenShare?: boolean;
}

export interface ChatMessage {
  id: string;
  socketId: string;
  username: string;
  message: string;
  timestamp: number;
}

export class MediaSoupClient {
  private socket: Socket | null = null;
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private videoProducer: Producer | null = null;
  private audioProducer: Producer | null = null;
  private screenProducer: Producer | null = null;
  private consumers: Map<string, Consumer> = new Map();
  private remoteStreams: Map<string, RemoteStream> = new Map();
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private roomId: string = '';
  private username: string = '';
  private peerUsernames: Map<string, string> = new Map();
  private pendingProducers: ProducerInfo[] = [];
  private isRecvTransportReady: boolean = false;

  // Callbacks
  public onLocalStream: ((stream: MediaStream) => void) | null = null;
  public onRemoteStream: ((streams: Map<string, RemoteStream>) => void) | null = null;
  public onPeerJoined: ((peer: Peer) => void) | null = null;
  public onPeerLeft: ((socketId: string) => void) | null = null;
  public onConnectionStateChange: ((state: string) => void) | null = null;
  public onError: ((error: string) => void) | null = null;
  public onScreenShareChange: ((isSharing: boolean) => void) | null = null;
  public onChatMessage: ((message: ChatMessage) => void) | null = null;
  public onTranscription: ((data: {
    id: string;
    socketId: string;
    username: string;
    originalText: string;
    translatedText?: string;
    originalLanguage: string;
    timestamp: string;
    isFinal: boolean;
  }) => void) | null = null;
  public onRecordingStarted: ((data: { recordingId: string; startedBy: string; startedAt: string }) => void) | null = null;
  public onRecordingStopped: ((data: { recordingId: string; downloadPath: string }) => void) | null = null;

  async connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      console.log('[MediaSoup] Connecting to server:', SERVER_URL);
      
      this.socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('[MediaSoup] Connected to server, socket id:', this.socket?.id);
        this.onConnectionStateChange?.('connected');
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[MediaSoup] Connection error:', error);
        this.onError?.('Failed to connect to server');
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[MediaSoup] Disconnected:', reason);
        this.onConnectionStateChange?.('disconnected');
      });

      // Handle new producer from other peers
      this.socket.on('new-producer', async ({ socketId, producerId, kind }: ProducerInfo) => {
        console.log(`[MediaSoup] 🎬 New producer event: ${producerId} (${kind}) from ${socketId}`);
        
        if (!this.isRecvTransportReady) {
          console.log('[MediaSoup] Receive transport not ready, queuing producer');
          this.pendingProducers.push({ socketId, producerId, kind });
          return;
        }
        
        try {
          await this.consumeProducer(socketId, producerId, kind);
        } catch (error) {
          console.error('[MediaSoup] Error consuming new producer:', error);
        }
      });

      // Handle user joined
      this.socket.on('user-joined', ({ socketId, username }: Peer) => {
        console.log(`[MediaSoup] 👤 User joined: ${username} (${socketId})`);
        this.peerUsernames.set(socketId, username);
        this.onPeerJoined?.({ socketId, username });
      });

      // Handle user left
      this.socket.on('user-left', ({ socketId, username }: Peer) => {
        console.log(`[MediaSoup] 👋 User left: ${username} (${socketId})`);
        this.peerUsernames.delete(socketId);
        this.removeRemoteStream(socketId);
        this.onPeerLeft?.(socketId);
      });

      // Handle chat messages
      this.socket.on('chat-message', (message: ChatMessage) => {
        console.log('[MediaSoup] 💬 Chat message received:', message);
        this.onChatMessage?.(message);
      });

      // Handle transcription events
      this.socket.on('transcription', (data: {
        id: string;
        socketId: string;
        username: string;
        originalText: string;
        translatedText?: string;
        originalLanguage: string;
        timestamp: string;
        isFinal: boolean;
      }) => {
        console.log('[MediaSoup] 📝 Transcription received:', data);
        this.onTranscription?.(data);
      });

      // Handle recording events
      this.socket.on('recording-started', (data: { recordingId: string; startedBy: string; startedAt: string }) => {
        console.log('[MediaSoup] 🔴 Recording started:', data);
        this.onRecordingStarted?.(data);
      });

      this.socket.on('recording-stopped', (data: { recordingId: string; downloadPath: string }) => {
        console.log('[MediaSoup] ⏹️ Recording stopped:', data);
        this.onRecordingStopped?.(data);
      });

      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  async joinRoom(roomId: string, username: string): Promise<Peer[]> {
    if (!this.socket) throw new Error('Not connected');

    this.roomId = roomId;
    this.username = username;

    return new Promise((resolve, reject) => {
      console.log(`[MediaSoup] Joining room: ${roomId} as ${username}`);
      
      this.socket!.emit('join-room', { roomId, username }, async (response: any) => {
        if (response.error) {
          console.error('[MediaSoup] Error joining room:', response.error);
          reject(new Error(response.error));
          return;
        }

        console.log('[MediaSoup] ✅ Joined room, RTP capabilities received');
        console.log('[MediaSoup] Existing peers:', response.peers);

        // Store peer usernames
        response.peers.forEach((peer: Peer) => {
          this.peerUsernames.set(peer.socketId, peer.username);
        });

        // Initialize device
        try {
          this.device = new Device();
          await this.device.load({ routerRtpCapabilities: response.rtpCapabilities });
          console.log('[MediaSoup] ✅ Device loaded with RTP capabilities');
          resolve(response.peers);
        } catch (error) {
          console.error('[MediaSoup] Error loading device:', error);
          reject(error);
        }
      });
    });
  }

  async createTransports(): Promise<void> {
    await this.createSendTransport();
    await this.createRecvTransport();
    
    // Mark receive transport as ready and process pending producers
    this.isRecvTransportReady = true;
    console.log('[MediaSoup] ✅ Both transports created, processing pending producers:', this.pendingProducers.length);
    
    for (const producer of this.pendingProducers) {
      try {
        await this.consumeProducer(producer.socketId, producer.producerId, producer.kind);
      } catch (error) {
        console.error('[MediaSoup] Error consuming pending producer:', error);
      }
    }
    this.pendingProducers = [];
  }

  private async createSendTransport(): Promise<void> {
    if (!this.socket || !this.device) throw new Error('Not initialized');

    return new Promise((resolve, reject) => {
      console.log('[MediaSoup] Creating send transport...');
      
      this.socket!.emit('create-transport', { roomId: this.roomId, direction: 'send' }, async (params: any) => {
        if (params.error) {
          console.error('[MediaSoup] Error creating send transport:', params.error);
          reject(new Error(params.error));
          return;
        }

        console.log('[MediaSoup] Send transport params received:', params.id);

        try {
          this.sendTransport = this.device!.createSendTransport(params);

          this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            console.log('[MediaSoup] Send transport connecting...');
            this.socket!.emit('connect-transport', {
              roomId: this.roomId,
              transportId: this.sendTransport!.id,
              dtlsParameters
            }, (response: any) => {
              if (response.error) {
                console.error('[MediaSoup] Send transport connect error:', response.error);
                errback(new Error(response.error));
              } else {
                console.log('[MediaSoup] ✅ Send transport connected');
                callback();
              }
            });
          });

          this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
            console.log(`[MediaSoup] Producing ${kind}...`);
            this.socket!.emit('produce', {
              roomId: this.roomId,
              transportId: this.sendTransport!.id,
              kind,
              rtpParameters
            }, (response: any) => {
              if (response.error) {
                console.error('[MediaSoup] Produce error:', response.error);
                errback(new Error(response.error));
              } else {
                console.log(`[MediaSoup] ✅ Producer created: ${response.id} (${kind})`);
                callback({ id: response.id });
              }
            });
          });

          this.sendTransport.on('connectionstatechange', (state) => {
            console.log('[MediaSoup] Send transport state:', state);
          });

          resolve();
        } catch (error) {
          console.error('[MediaSoup] Error creating send transport:', error);
          reject(error);
        }
      });
    });
  }

  private async createRecvTransport(): Promise<void> {
    if (!this.socket || !this.device) throw new Error('Not initialized');

    return new Promise((resolve, reject) => {
      console.log('[MediaSoup] Creating receive transport...');
      
      this.socket!.emit('create-transport', { roomId: this.roomId, direction: 'receive' }, async (params: any) => {
        if (params.error) {
          console.error('[MediaSoup] Error creating receive transport:', params.error);
          reject(new Error(params.error));
          return;
        }

        console.log('[MediaSoup] Receive transport params received:', params.id);

        try {
          this.recvTransport = this.device!.createRecvTransport(params);

          this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            console.log('[MediaSoup] Receive transport connecting...');
            this.socket!.emit('connect-transport', {
              roomId: this.roomId,
              transportId: this.recvTransport!.id,
              dtlsParameters
            }, (response: any) => {
              if (response.error) {
                console.error('[MediaSoup] Receive transport connect error:', response.error);
                errback(new Error(response.error));
              } else {
                console.log('[MediaSoup] ✅ Receive transport connected');
                callback();
              }
            });
          });

          this.recvTransport.on('connectionstatechange', (state) => {
            console.log('[MediaSoup] Receive transport state:', state);
          });

          resolve();
        } catch (error) {
          console.error('[MediaSoup] Error creating receive transport:', error);
          reject(error);
        }
      });
    });
  }

  async startProducing(): Promise<MediaStream> {
    if (!this.sendTransport) throw new Error('Send transport not created');

    console.log('[MediaSoup] Getting user media...');
    
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('[MediaSoup] ✅ Got local stream with tracks:', this.localStream.getTracks().map(t => t.kind));
      this.onLocalStream?.(this.localStream);

      const videoTrack = this.localStream.getVideoTracks()[0];
      const audioTrack = this.localStream.getAudioTracks()[0];

      if (videoTrack) {
        console.log('[MediaSoup] Producing video track...');
        this.videoProducer = await this.sendTransport.produce({ track: videoTrack });
        console.log('[MediaSoup] ✅ Video producer created:', this.videoProducer.id);
      }

      if (audioTrack) {
        console.log('[MediaSoup] Producing audio track...');
        this.audioProducer = await this.sendTransport.produce({ track: audioTrack });
        console.log('[MediaSoup] ✅ Audio producer created:', this.audioProducer.id);
      }

      return this.localStream;
    } catch (error) {
      console.error('[MediaSoup] Error getting user media:', error);
      throw error;
    }
  }

  async startScreenShare(): Promise<MediaStream | null> {
    if (!this.sendTransport) throw new Error('Send transport not created');

    try {
      console.log('[MediaSoup] Starting screen share...');
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      const screenTrack = this.screenStream.getVideoTracks()[0];
      
      // Handle when user stops screen share from browser UI
      screenTrack.onended = () => {
        console.log('[MediaSoup] Screen share ended by user');
        this.stopScreenShare();
      };

      this.screenProducer = await this.sendTransport.produce({ 
        track: screenTrack,
      });
      
      console.log('[MediaSoup] ✅ Screen share producer created:', this.screenProducer.id);
      this.onScreenShareChange?.(true);
      
      return this.screenStream;
    } catch (error) {
      console.error('[MediaSoup] Error starting screen share:', error);
      this.screenStream = null;
      return null;
    }
  }

  async stopScreenShare(): Promise<void> {
    if (this.screenProducer) {
      this.screenProducer.close();
      this.screenProducer = null;
    }
    
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    
    console.log('[MediaSoup] Screen share stopped');
    this.onScreenShareChange?.(false);
  }

  isScreenSharing(): boolean {
    return this.screenProducer !== null && !this.screenProducer.closed;
  }

  async sendChatMessage(message: string): Promise<void> {
    if (!this.socket || !this.roomId) return;
    
    const chatMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      socketId: this.socket.id!,
      username: this.username,
      message,
      timestamp: Date.now()
    };
    
    this.socket.emit('chat-message', { roomId: this.roomId, ...chatMessage });
    // Also trigger local callback
    this.onChatMessage?.(chatMessage);
  }

  async consumeExistingProducers(): Promise<void> {
    if (!this.socket) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      console.log('[MediaSoup] Getting existing producers...');
      
      this.socket!.emit('get-producers', { roomId: this.roomId }, async (response: any) => {
        if (response.error) {
          console.error('[MediaSoup] Error getting producers:', response.error);
          reject(new Error(response.error));
          return;
        }

        console.log('[MediaSoup] 📋 Existing producers:', response.producers.length, response.producers);

        for (const producer of response.producers) {
          try {
            await this.consumeProducer(producer.socketId, producer.producerId, producer.kind);
          } catch (error) {
            console.error('[MediaSoup] Error consuming existing producer:', error);
          }
        }

        resolve();
      });
    });
  }

  private async consumeProducer(socketId: string, producerId: string, kind: 'audio' | 'video'): Promise<void> {
    if (!this.socket || !this.recvTransport || !this.device) {
      console.error('[MediaSoup] Cannot consume - not initialized. Socket:', !!this.socket, 'RecvTransport:', !!this.recvTransport, 'Device:', !!this.device);
      return;
    }

    console.log(`[MediaSoup] 🔄 Consuming ${kind} from ${socketId} (producer: ${producerId})`);

    return new Promise((resolve, reject) => {
      this.socket!.emit('consume', {
        roomId: this.roomId,
        transportId: this.recvTransport!.id,
        producerId,
        rtpCapabilities: this.device!.rtpCapabilities
      }, async (response: any) => {
        if (response.error) {
          console.error('[MediaSoup] ❌ Error consuming:', response.error);
          reject(new Error(response.error));
          return;
        }

        console.log(`[MediaSoup] Consumer params received for ${kind}:`, {
          id: response.id,
          producerId: response.producerId,
          kind: response.kind
        });

        try {
          const consumer = await this.recvTransport!.consume({
            id: response.id,
            producerId: response.producerId,
            kind: response.kind,
            rtpParameters: response.rtpParameters
          });

          console.log(`[MediaSoup] ✅ Consumer created: ${consumer.id} (${kind})`);
          console.log(`[MediaSoup] Consumer track:`, consumer.track.kind, 'readyState:', consumer.track.readyState, 'enabled:', consumer.track.enabled);
          
          this.consumers.set(consumer.id, consumer);

          // Resume the consumer and wait for it
          await new Promise<void>((resumeResolve, resumeReject) => {
            this.socket!.emit('resume-consumer', { roomId: this.roomId, consumerId: consumer.id }, (resumeResponse: any) => {
              if (resumeResponse.error) {
                console.error('[MediaSoup] ❌ Error resuming consumer:', resumeResponse.error);
                resumeReject(new Error(resumeResponse.error));
              } else {
                console.log(`[MediaSoup] ✅ Consumer resumed: ${consumer.id}`);
                resumeResolve();
              }
            });
          });

          // Add to remote streams after resume
          this.addToRemoteStream(socketId, consumer, kind);
          resolve();
        } catch (error) {
          console.error('[MediaSoup] ❌ Error creating/resuming consumer:', error);
          reject(error);
        }
      });
    });
  }

  private addToRemoteStream(socketId: string, consumer: Consumer, kind: 'audio' | 'video'): void {
    let remoteStream = this.remoteStreams.get(socketId);

    if (!remoteStream) {
      console.log(`[MediaSoup] Creating new remote stream for ${socketId}`);
      remoteStream = {
        socketId,
        username: this.peerUsernames.get(socketId) || 'Unknown',
        stream: new MediaStream()
      };
      this.remoteStreams.set(socketId, remoteStream);
    }

    // Check if track already exists
    const existingTracks = remoteStream.stream.getTracks().filter(t => t.kind === kind);
    if (existingTracks.length > 0) {
      console.log(`[MediaSoup] Removing existing ${kind} track`);
      existingTracks.forEach(t => remoteStream!.stream.removeTrack(t));
    }

    // Add the track to the stream
    const track = consumer.track;
    console.log(`[MediaSoup] Adding ${kind} track to stream. Track state:`, track.readyState, 'muted:', track.muted, 'enabled:', track.enabled);
    remoteStream.stream.addTrack(track);

    if (kind === 'video') {
      remoteStream.videoConsumer = consumer;
    } else {
      remoteStream.audioConsumer = consumer;
    }

    console.log(`[MediaSoup] ✅ Added ${kind} track to remote stream for ${socketId}`);
    console.log('[MediaSoup] Remote stream now has tracks:', remoteStream.stream.getTracks().map(t => ({ kind: t.kind, readyState: t.readyState, enabled: t.enabled })));
    console.log('[MediaSoup] Total remote streams:', this.remoteStreams.size);

    // Notify about updated streams
    this.onRemoteStream?.(new Map(this.remoteStreams));
  }

  private removeRemoteStream(socketId: string): void {
    const remoteStream = this.remoteStreams.get(socketId);
    if (remoteStream) {
      console.log(`[MediaSoup] Removing remote stream for ${socketId}`);
      // Close consumers
      if (remoteStream.videoConsumer) {
        remoteStream.videoConsumer.close();
        this.consumers.delete(remoteStream.videoConsumer.id);
      }
      if (remoteStream.audioConsumer) {
        remoteStream.audioConsumer.close();
        this.consumers.delete(remoteStream.audioConsumer.id);
      }
      // Stop all tracks
      remoteStream.stream.getTracks().forEach(track => track.stop());
      this.remoteStreams.delete(socketId);
      this.onRemoteStream?.(new Map(this.remoteStreams));
    }
  }

  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  async disconnect(): Promise<void> {
    console.log('[MediaSoup] Disconnecting...');

    this.isRecvTransportReady = false;
    this.pendingProducers = [];

    // Stop screen share if active
    await this.stopScreenShare();

    // Close producers
    if (this.videoProducer) {
      this.videoProducer.close();
      this.videoProducer = null;
    }
    if (this.audioProducer) {
      this.audioProducer.close();
      this.audioProducer = null;
    }

    // Close consumers
    this.consumers.forEach(consumer => consumer.close());
    this.consumers.clear();

    // Close transports
    if (this.sendTransport) {
      this.sendTransport.close();
      this.sendTransport = null;
    }
    if (this.recvTransport) {
      this.recvTransport.close();
      this.recvTransport = null;
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Clear remote streams
    this.remoteStreams.forEach(stream => {
      stream.stream.getTracks().forEach(track => track.stop());
    });
    this.remoteStreams.clear();

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.device = null;
    this.peerUsernames.clear();
  }

  getRemoteStreams(): Map<string, RemoteStream> {
    return this.remoteStreams;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Transcription methods
  startTranscription(targetLanguage: string): void {
    if (this.socket) {
      this.socket.emit('start-transcription', { 
        roomId: this.roomId, 
        username: this.username,
        targetLanguage 
      });
    }
  }

  stopTranscription(): void {
    if (this.socket) {
      this.socket.emit('stop-transcription', { roomId: this.roomId });
    }
  }

  sendAudioChunk(audioData: number[]): void {
    if (this.socket) {
      this.socket.emit('audio-chunk', {
        roomId: this.roomId,
        username: this.username,
        audioData,
      });
    }
  }

  setTargetLanguage(targetLanguage: string): void {
    if (this.socket) {
      this.socket.emit('set-target-language', { 
        roomId: this.roomId, 
        targetLanguage 
      });
    }
  }

  // Recording methods
  startRecording(): void {
    if (this.socket) {
      console.log('[MediaSoup] Starting recording...');
      this.socket.emit('start-recording', { 
        roomId: this.roomId,
        username: this.username 
      });
    }
  }

  stopRecording(): void {
    if (this.socket) {
      console.log('[MediaSoup] Stopping recording...');
      this.socket.emit('stop-recording', { roomId: this.roomId });
    }
  }
}

export const createMediaSoupClient = () => new MediaSoupClient();
