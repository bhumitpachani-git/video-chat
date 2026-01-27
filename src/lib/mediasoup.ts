import { io, Socket } from 'socket.io-client';
import { Device, types } from 'mediasoup-client';

type Transport = types.Transport;
type Producer = types.Producer;
type Consumer = types.Consumer;

const SERVER_URL = `http://${window.location.hostname}:3000`;

export interface Peer {
  socketId: string;
  username: string;
  isHost?: boolean;
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
  isHost?: boolean;
}

export interface ScreenShareStream {
  socketId: string;
  username: string;
  stream: MediaStream;
  consumer: Consumer;
}

export interface ChatMessage {
  id: string;
  socketId: string;
  username: string;
  message: string;
  timestamp: number;
  toSocketId?: string;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  creatorUsername: string;
  isAnonymous: boolean;
  allowMultiple: boolean;
  createdAt: string;
  results?: number[];
  totalVotes?: number;
  active: boolean;
}

export interface WhiteboardStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: 'pen' | 'eraser';
}

export interface WhiteboardState {
  strokes: WhiteboardStroke[];
  background: string;
}

export interface ProducerInfoWithType extends ProducerInfo {
  isScreenShare?: boolean;
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
  private screenShareStreams: Map<string, ScreenShareStream> = new Map();
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private roomId: string = '';
  private username: string = '';
  private peerUsernames: Map<string, string> = new Map();
  private pendingProducers: ProducerInfoWithType[] = [];
  private isRecvTransportReady: boolean = false;
  private screenShareProducerIds: Set<string> = new Set();

  // Callbacks
  public onLocalStream: ((stream: MediaStream) => void) | null = null;
  public onRemoteStream: ((streams: Map<string, RemoteStream>) => void) | null = null;
  public onScreenShareStream: ((streams: Map<string, ScreenShareStream>) => void) | null = null;
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
  
  // Polls callbacks
  public onNewPoll: ((poll: Poll) => void) | null = null;
  public onPollUpdated: ((data: { pollId: string; results: number[]; totalVotes: number }) => void) | null = null;
  public onPollClosed: ((data: { pollId: string; finalResults: number[]; totalVotes: number }) => void) | null = null;
  public onPollsSync: ((polls: Poll[]) => void) | null = null;
  
  // Whiteboard callbacks
  public onWhiteboardStroke: ((stroke: WhiteboardStroke) => void) | null = null;
  public onWhiteboardClear: (() => void) | null = null;
  public onWhiteboardUndo: (() => void) | null = null;
  public onWhiteboardSync: ((state: WhiteboardState) => void) | null = null;
  public onWhiteboardPresent: ((data: { socketId: string; username: string; isPresenting: boolean }) => void) | null = null;
  
  // Notes callbacks
  public onNotesUpdated: ((notes: string) => void) | null = null;
  public onNotesPresent: ((data: { socketId: string; username: string; isPresenting: boolean }) => void) | null = null;
  public onHostChanged: ((data: { newHostId: string; username: string }) => void) | null = null;
  public onForceMute: ((data: { kind: 'audio' | 'video' }) => void) | null = null;

  private isHostFlag: boolean = false;
  
  // Initial room state
  private initialWhiteboard: WhiteboardState | null = null;
  private initialNotes: string = '';
  private initialPolls: Poll[] = [];

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
      this.socket.on('new-producer', async ({ socketId, producerId, kind, isScreenShare }: ProducerInfoWithType) => {
        console.log(`[MediaSoup] 🎬 New producer event: ${producerId} (${kind}) from ${socketId}, isScreenShare: ${isScreenShare}`);
        
        if (isScreenShare) {
          this.screenShareProducerIds.add(producerId);
        }
        
        if (!this.isRecvTransportReady) {
          console.log('[MediaSoup] Receive transport not ready, queuing producer');
          this.pendingProducers.push({ socketId, producerId, kind, isScreenShare });
          return;
        }
        
        try {
          await this.consumeProducer(socketId, producerId, kind, isScreenShare);
        } catch (error) {
          console.error('[MediaSoup] Error consuming new producer:', error);
        }
      });

      // Handle screen share stopped
      this.socket.on('screen-share-stopped', ({ socketId, producerId }: { socketId: string; producerId: string }) => {
        console.log(`[MediaSoup] 📺 Screen share stopped from ${socketId}`);
        this.screenShareProducerIds.delete(producerId);
        this.removeScreenShareStream(socketId);
      });

      // Handle user joined
      this.socket.on('user-joined', ({ socketId, username, isHost }: Peer) => {
        console.log(`[MediaSoup] 👤 User joined: ${username} (${socketId}), isHost: ${isHost}`);
        this.peerUsernames.set(socketId, username);
        this.onPeerJoined?.({ socketId, username, isHost });
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

      // Poll events
      this.socket.on('new-poll', (poll: Poll) => {
        console.log('[MediaSoup] 📊 New poll:', poll);
        this.onNewPoll?.({ ...poll, active: true });
      });

      this.socket.on('poll-updated', (data: { pollId: string; results: number[]; totalVotes: number }) => {
        console.log('[MediaSoup] 📊 Poll updated:', data);
        this.onPollUpdated?.(data);
      });

      this.socket.on('poll-closed', (data: { pollId: string; finalResults: number[]; totalVotes: number }) => {
        console.log('[MediaSoup] 📊 Poll closed:', data);
        this.onPollClosed?.(data);
      });

      // Whiteboard events - server sends 'whiteboard-draw' event
      this.socket.on('whiteboard-draw', (stroke: WhiteboardStroke) => {
        console.log('[MediaSoup] 🎨 Whiteboard stroke received');
        this.onWhiteboardStroke?.(stroke);
      });

      this.socket.on('whiteboard-cleared', () => {
        console.log('[MediaSoup] 🎨 Whiteboard cleared');
        this.onWhiteboardClear?.();
      });

      this.socket.on('whiteboard-undo', () => {
        console.log('[MediaSoup] 🎨 Whiteboard undo');
        // Handle undo by removing last stroke
        this.onWhiteboardUndo?.();
      });

      this.socket.on('whiteboard-sync', (state: WhiteboardState) => {
        console.log('[MediaSoup] 🎨 Whiteboard synced');
        this.onWhiteboardSync?.(state);
      });

      // Whiteboard present event - when someone shares whiteboard fullscreen
      this.socket.on('whiteboard-present', (data: { socketId: string; username: string; isPresenting: boolean }) => {
        console.log('[MediaSoup] 🎨 Whiteboard present:', data);
        this.onWhiteboardPresent?.(data);
      });

      // Notes events - server sends 'notes-updated' with { content }
      this.socket.on('notes-updated', ({ content }: { content: string }) => {
        console.log('[MediaSoup] 📝 Notes updated');
        this.onNotesUpdated?.(content);
      });

      // Notes present event - when someone shares notes fullscreen
      this.socket.on('notes-present', (data: { socketId: string; username: string; isPresenting: boolean }) => {
        console.log('[MediaSoup] 📝 Notes present:', data);
        this.onNotesPresent?.(data);
      });

      this.socket.on('host-changed', (data: { newHostId: string; username: string }) => {
        console.log('[MediaSoup] 👑 Host changed:', data);
        this.onHostChanged?.(data);
      });

      this.socket.on('force-mute', (data: { kind: 'audio' | 'video' }) => {
        console.log('[MediaSoup] 🔇 Force mute received:', data);
        this.onForceMute?.(data);
        if (data.kind === 'audio') {
          this.toggleAudio(false);
        } else {
          this.toggleVideo(false);
        }
      });

      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  public getSocketId(): string | undefined {
    return this.socket?.id;
  }

  async joinRoom(roomId: string, username: string, password?: string): Promise<Peer[]> {
    if (!this.socket) throw new Error('Not connected');

    this.roomId = roomId;
    this.username = username;

    return new Promise((resolve, reject) => {
      console.log(`[MediaSoup] Joining room: ${roomId} as ${username}`);
      
      this.socket!.emit('join-room', { roomId, username, password }, async (response: any) => {
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
          
          if (response.isHost) {
            this.isHostFlag = true;
            this.onHostChanged?.({ newHostId: this.socket!.id!, username: this.username });
          }

          // Store and emit initial room state
          if (response.whiteboard) {
            console.log('[MediaSoup] 🎨 Initial whiteboard state:', response.whiteboard.strokes?.length || 0, 'strokes');
            this.initialWhiteboard = response.whiteboard;
            this.onWhiteboardSync?.(response.whiteboard);
          }
          if (response.notes) {
            console.log('[MediaSoup] 📝 Initial notes:', response.notes.length, 'chars');
            this.initialNotes = response.notes;
            this.onNotesUpdated?.(response.notes);
          }
          if (response.polls && response.polls.length > 0) {
            console.log('[MediaSoup] 📊 Initial polls:', response.polls.length);
            this.initialPolls = response.polls;
            this.onPollsSync?.(response.polls);
          }
          
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
        await this.consumeProducer(producer.socketId, producer.producerId, producer.kind, producer.isScreenShare);
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

    console.log('[MediaSoup] Getting user media with enhanced audio processing...');
    
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          // Enhanced noise cancellation settings
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          // Advanced constraints for better audio quality
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48000 },
          sampleSize: { ideal: 16 },
          // Additional noise reduction
          // @ts-ignore - these are experimental but widely supported
          googEchoCancellation: { ideal: true },
          // @ts-ignore
          googAutoGainControl: { ideal: true },
          // @ts-ignore
          googNoiseSuppression: { ideal: true },
          // @ts-ignore
          googHighpassFilter: { ideal: true },
        }
      });

      console.log('[MediaSoup] ✅ Got local stream with tracks:', this.localStream.getTracks().map(t => t.kind));
      
      // Log audio constraints applied
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        const settings = audioTrack.getSettings();
        console.log('[MediaSoup] Audio settings applied:', {
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
          sampleRate: settings.sampleRate,
        });
      }
      
      this.onLocalStream?.(this.localStream);

      const videoTrack = this.localStream.getVideoTracks()[0];

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
    if (!this.sendTransport || !this.socket) throw new Error('Send transport not created');

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

      // Produce with appData to mark as screen share
      this.screenProducer = await this.sendTransport.produce({ 
        track: screenTrack,
        appData: { isScreenShare: true }
      });
      
      console.log('[MediaSoup] ✅ Screen share producer created:', this.screenProducer.id);
      
      // Notify server this is a screen share producer
      this.socket.emit('mark-screen-share', { 
        roomId: this.roomId, 
        producerId: this.screenProducer.id 
      });
      
      this.onScreenShareChange?.(true);
      
      return this.screenStream;
    } catch (error) {
      console.error('[MediaSoup] Error starting screen share:', error);
      this.screenStream = null;
      return null;
    }
  }

  async stopScreenShare(): Promise<void> {
    const producerId = this.screenProducer?.id;
    
    if (this.screenProducer) {
      this.screenProducer.close();
      this.screenProducer = null;
    }
    
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    
    // Notify server that screen share stopped
    if (this.socket && producerId) {
      this.socket.emit('screen-share-stopped', { 
        roomId: this.roomId, 
        producerId 
      });
    }
    
    console.log('[MediaSoup] Screen share stopped');
    this.onScreenShareChange?.(false);
  }

  isScreenSharing(): boolean {
    return this.screenProducer !== null && !this.screenProducer.closed;
  }

  async sendChatMessage(message: string, toSocketId?: string): Promise<void> {
    if (!this.socket || !this.roomId) return;
    
    // Server expects 'send-chat-message' for routing
    this.socket.emit('send-chat-message', { roomId: this.roomId, message, toSocketId });
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
            const isScreenShare = producer.isScreenShare || this.screenShareProducerIds.has(producer.producerId);
            await this.consumeProducer(producer.socketId, producer.producerId, producer.kind, isScreenShare);
          } catch (error) {
            console.error('[MediaSoup] Error consuming existing producer:', error);
          }
        }

        resolve();
      });
    });
  }

  private async consumeProducer(socketId: string, producerId: string, kind: 'audio' | 'video', isScreenShare?: boolean): Promise<void> {
    if (!this.socket || !this.recvTransport || !this.device) {
      console.error('[MediaSoup] Cannot consume - not initialized. Socket:', !!this.socket, 'RecvTransport:', !!this.recvTransport, 'Device:', !!this.device);
      return;
    }

    console.log(`[MediaSoup] 🔄 Consuming ${kind} from ${socketId} (producer: ${producerId}, screenShare: ${isScreenShare})`);

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

          // Add to appropriate stream collection after resume
          if (isScreenShare && kind === 'video') {
            this.addToScreenShareStream(socketId, consumer);
          } else {
            this.addToRemoteStream(socketId, consumer, kind);
          }
          resolve();
        } catch (error) {
          console.error('[MediaSoup] ❌ Error creating/resuming consumer:', error);
          reject(error);
        }
      });
    });
  }

  private addToScreenShareStream(socketId: string, consumer: Consumer): void {
    console.log(`[MediaSoup] 📺 Creating screen share stream for ${socketId}`);
    
    const screenShareStream: ScreenShareStream = {
      socketId,
      username: this.peerUsernames.get(socketId) || 'Unknown',
      stream: new MediaStream([consumer.track]),
      consumer
    };
    
    this.screenShareStreams.set(socketId, screenShareStream);
    
    console.log(`[MediaSoup] ✅ Screen share stream added for ${socketId}`);
    console.log('[MediaSoup] Total screen share streams:', this.screenShareStreams.size);
    
    this.onScreenShareStream?.(new Map(this.screenShareStreams));
  }

  private removeScreenShareStream(socketId: string): void {
    const screenShareStream = this.screenShareStreams.get(socketId);
    if (screenShareStream) {
      console.log(`[MediaSoup] Removing screen share stream for ${socketId}`);
      screenShareStream.consumer.close();
      this.consumers.delete(screenShareStream.consumer.id);
      screenShareStream.stream.getTracks().forEach(track => track.stop());
      this.screenShareStreams.delete(socketId);
      this.onScreenShareStream?.(new Map(this.screenShareStreams));
    }
  }

  private addToRemoteStream(socketId: string, consumer: Consumer, kind: 'audio' | 'video'): void {
    let remoteStream = this.remoteStreams.get(socketId);

    if (!remoteStream) {
      console.log(`[MediaSoup] Creating new remote stream for ${socketId}`);
      remoteStream = {
        socketId,
        username: this.peerUsernames.get(socketId) || 'Unknown',
        stream: new MediaStream(),
        isHost: this.peerUsernames.has(socketId) // Placeholder: we should ideally sync this
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
    
    // Also remove any screen share stream from this user
    this.removeScreenShareStream(socketId);
  }

  toggleVideo(force?: boolean): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = force !== undefined ? force : !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  toggleAudio(force?: boolean): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = force !== undefined ? force : !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  muteParticipant(targetSocketId: string, kind: 'audio' | 'video'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.roomId) return reject(new Error('Not connected'));
      this.socket.emit('mute-participant', { roomId: this.roomId, targetSocketId, kind }, (response: any) => {
        if (response.error) reject(new Error(response.error));
        else resolve();
      });
    });
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
    
    // Clear screen share streams
    this.screenShareStreams.forEach(stream => {
      stream.stream.getTracks().forEach(track => track.stop());
    });
    this.screenShareStreams.clear();
    this.screenShareProducerIds.clear();

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
  
  getScreenShareStreams(): Map<string, ScreenShareStream> {
    return this.screenShareStreams;
  }

  // Transcription methods
  startTranscription(targetLanguage: string, speakingLanguage: string = 'auto'): void {
    if (this.socket) {
      this.socket.emit('start-transcription', { 
        roomId: this.roomId, 
        username: this.username,
        targetLanguage,
        speakingLanguage
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

  // Poll methods
  createPoll(question: string, options: string[], isAnonymous: boolean = false, allowMultiple: boolean = false): void {
    if (this.socket) {
      console.log('[MediaSoup] Creating poll...');
      this.socket.emit('create-poll', {
        roomId: this.roomId,
        question,
        options,
        isAnonymous,
        allowMultiple
      });
    }
  }

  submitVote(pollId: string, selectedOptions: number[]): void {
    if (this.socket) {
      console.log('[MediaSoup] Submitting vote...');
      this.socket.emit('submit-vote', {
        roomId: this.roomId,
        pollId,
        selectedOptions
      });
    }
  }

  closePoll(pollId: string): void {
    if (this.socket) {
      console.log('[MediaSoup] Closing poll...');
      this.socket.emit('close-poll', {
        roomId: this.roomId,
        pollId
      });
    }
  }

  // Whiteboard methods - server expects 'whiteboard-draw' event
  sendWhiteboardStroke(stroke: WhiteboardStroke): void {
    if (this.socket) {
      console.log('[MediaSoup] 🎨 Sending whiteboard stroke to room:', this.roomId);
      this.socket.emit('whiteboard-draw', {
        roomId: this.roomId,
        stroke
      });
    } else {
      console.error('[MediaSoup] Cannot send whiteboard stroke - socket not connected');
    }
  }

  clearWhiteboard(): void {
    if (this.socket) {
      console.log('[MediaSoup] 🎨 Clearing whiteboard in room:', this.roomId);
      this.socket.emit('whiteboard-clear', { roomId: this.roomId });
    } else {
      console.error('[MediaSoup] Cannot clear whiteboard - socket not connected');
    }
  }

  undoWhiteboard(): void {
    if (this.socket) {
      console.log('[MediaSoup] 🎨 Undo whiteboard in room:', this.roomId);
      this.socket.emit('whiteboard-undo', { roomId: this.roomId });
    }
  }

  requestWhiteboardSync(): void {
    if (this.socket) {
      this.socket.emit('whiteboard-sync-request', { roomId: this.roomId });
    }
  }

  // Notes methods - server expects 'notes-update' with { roomId, content }
  updateNotes(notes: string): void {
    if (this.socket) {
      console.log('[MediaSoup] 📝 Sending notes update to room:', this.roomId, 'length:', notes.length);
      this.socket.emit('notes-update', {
        roomId: this.roomId,
        content: notes
      });
    } else {
      console.error('[MediaSoup] Cannot update notes - socket not connected');
    }
  }

  // Present whiteboard to everyone
  presentWhiteboard(isPresenting: boolean): void {
    if (this.socket) {
      console.log('[MediaSoup] 🎨 Presenting whiteboard:', isPresenting);
      this.socket.emit('whiteboard-present', {
        roomId: this.roomId,
        isPresenting
      });
    }
  }

  // Present notes to everyone
  presentNotes(isPresenting: boolean): void {
    if (this.socket) {
      console.log('[MediaSoup] 📝 Presenting notes:', isPresenting);
      this.socket.emit('notes-present', {
        roomId: this.roomId,
        isPresenting
      });
    }
  }

  getInitialWhiteboard(): WhiteboardState | null {
    return this.initialWhiteboard;
  }

  getInitialNotes(): string {
    return this.initialNotes;
  }
}

export const createMediaSoupClient = () => new MediaSoupClient();
