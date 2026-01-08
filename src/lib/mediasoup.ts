import { io, Socket } from 'socket.io-client';
import { Device, types } from 'mediasoup-client';

type Transport = types.Transport;
type Producer = types.Producer;
type Consumer = types.Consumer;
type RtpCapabilities = types.RtpCapabilities;

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
}

export class MediaSoupClient {
  private socket: Socket | null = null;
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private videoProducer: Producer | null = null;
  private audioProducer: Producer | null = null;
  private consumers: Map<string, Consumer> = new Map();
  private remoteStreams: Map<string, RemoteStream> = new Map();
  private localStream: MediaStream | null = null;
  private roomId: string = '';
  private username: string = '';
  private peerUsernames: Map<string, string> = new Map();

  // Callbacks
  public onLocalStream: ((stream: MediaStream) => void) | null = null;
  public onRemoteStream: ((streams: Map<string, RemoteStream>) => void) | null = null;
  public onPeerJoined: ((peer: Peer) => void) | null = null;
  public onPeerLeft: ((socketId: string) => void) | null = null;
  public onConnectionStateChange: ((state: string) => void) | null = null;
  public onError: ((error: string) => void) | null = null;

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
        console.log(`[MediaSoup] New producer: ${producerId} (${kind}) from ${socketId}`);
        await this.consumeProducer(socketId, producerId, kind);
      });

      // Handle user joined
      this.socket.on('user-joined', ({ socketId, username }: Peer) => {
        console.log(`[MediaSoup] User joined: ${username} (${socketId})`);
        this.peerUsernames.set(socketId, username);
        this.onPeerJoined?.({ socketId, username });
      });

      // Handle user left
      this.socket.on('user-left', ({ socketId, username }: Peer) => {
        console.log(`[MediaSoup] User left: ${username} (${socketId})`);
        this.peerUsernames.delete(socketId);
        this.removeRemoteStream(socketId);
        this.onPeerLeft?.(socketId);
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

        console.log('[MediaSoup] Joined room, RTP capabilities received');
        console.log('[MediaSoup] Existing peers:', response.peers);

        // Store peer usernames
        response.peers.forEach((peer: Peer) => {
          this.peerUsernames.set(peer.socketId, peer.username);
        });

        // Initialize device
        try {
          this.device = new Device();
          await this.device.load({ routerRtpCapabilities: response.rtpCapabilities });
          console.log('[MediaSoup] Device loaded');
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
  }

  private async createSendTransport(): Promise<void> {
    if (!this.socket || !this.device) throw new Error('Not initialized');

    return new Promise((resolve, reject) => {
      console.log('[MediaSoup] Creating send transport');
      
      this.socket!.emit('create-transport', { roomId: this.roomId, direction: 'send' }, async (params: any) => {
        if (params.error) {
          reject(new Error(params.error));
          return;
        }

        console.log('[MediaSoup] Send transport params received:', params.id);

        this.sendTransport = this.device!.createSendTransport(params);

        this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          console.log('[MediaSoup] Send transport connecting...');
          this.socket!.emit('connect-transport', {
            roomId: this.roomId,
            transportId: this.sendTransport!.id,
            dtlsParameters
          }, (response: any) => {
            if (response.error) {
              errback(new Error(response.error));
            } else {
              console.log('[MediaSoup] Send transport connected');
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
              errback(new Error(response.error));
            } else {
              console.log(`[MediaSoup] Producer created: ${response.id}`);
              callback({ id: response.id });
            }
          });
        });

        this.sendTransport.on('connectionstatechange', (state) => {
          console.log('[MediaSoup] Send transport state:', state);
        });

        resolve();
      });
    });
  }

  private async createRecvTransport(): Promise<void> {
    if (!this.socket || !this.device) throw new Error('Not initialized');

    return new Promise((resolve, reject) => {
      console.log('[MediaSoup] Creating receive transport');
      
      this.socket!.emit('create-transport', { roomId: this.roomId, direction: 'receive' }, async (params: any) => {
        if (params.error) {
          reject(new Error(params.error));
          return;
        }

        console.log('[MediaSoup] Receive transport params received:', params.id);

        this.recvTransport = this.device!.createRecvTransport(params);

        this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          console.log('[MediaSoup] Receive transport connecting...');
          this.socket!.emit('connect-transport', {
            roomId: this.roomId,
            transportId: this.recvTransport!.id,
            dtlsParameters
          }, (response: any) => {
            if (response.error) {
              errback(new Error(response.error));
            } else {
              console.log('[MediaSoup] Receive transport connected');
              callback();
            }
          });
        });

        this.recvTransport.on('connectionstatechange', (state) => {
          console.log('[MediaSoup] Receive transport state:', state);
        });

        resolve();
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

      console.log('[MediaSoup] Got local stream');
      this.onLocalStream?.(this.localStream);

      const videoTrack = this.localStream.getVideoTracks()[0];
      const audioTrack = this.localStream.getAudioTracks()[0];

      if (videoTrack) {
        console.log('[MediaSoup] Producing video...');
        this.videoProducer = await this.sendTransport.produce({ track: videoTrack });
        console.log('[MediaSoup] Video producer created:', this.videoProducer.id);
      }

      if (audioTrack) {
        console.log('[MediaSoup] Producing audio...');
        this.audioProducer = await this.sendTransport.produce({ track: audioTrack });
        console.log('[MediaSoup] Audio producer created:', this.audioProducer.id);
      }

      return this.localStream;
    } catch (error) {
      console.error('[MediaSoup] Error getting user media:', error);
      throw error;
    }
  }

  async consumeExistingProducers(): Promise<void> {
    if (!this.socket) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      console.log('[MediaSoup] Getting existing producers...');
      
      this.socket!.emit('get-producers', { roomId: this.roomId }, async (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        console.log('[MediaSoup] Existing producers:', response.producers);

        for (const producer of response.producers) {
          await this.consumeProducer(producer.socketId, producer.producerId, producer.kind);
        }

        resolve();
      });
    });
  }

  private async consumeProducer(socketId: string, producerId: string, kind: 'audio' | 'video'): Promise<void> {
    if (!this.socket || !this.recvTransport || !this.device) {
      console.error('[MediaSoup] Cannot consume - not initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      console.log(`[MediaSoup] Consuming ${kind} from ${socketId}...`);

      this.socket!.emit('consume', {
        roomId: this.roomId,
        transportId: this.recvTransport!.id,
        producerId,
        rtpCapabilities: this.device!.rtpCapabilities
      }, async (response: any) => {
        if (response.error) {
          console.error('[MediaSoup] Error consuming:', response.error);
          reject(new Error(response.error));
          return;
        }

        console.log(`[MediaSoup] Consumer params received for ${kind}:`, response.id);

        try {
          const consumer = await this.recvTransport!.consume({
            id: response.id,
            producerId: response.producerId,
            kind: response.kind,
            rtpParameters: response.rtpParameters
          });

          console.log(`[MediaSoup] Consumer created: ${consumer.id}`);
          this.consumers.set(consumer.id, consumer);

          // Resume the consumer
          this.socket!.emit('resume-consumer', { roomId: this.roomId, consumerId: consumer.id }, (resumeResponse: any) => {
            if (resumeResponse.error) {
              console.error('[MediaSoup] Error resuming consumer:', resumeResponse.error);
            } else {
              console.log(`[MediaSoup] Consumer resumed: ${consumer.id}`);
            }
          });

          // Add to remote streams
          this.addToRemoteStream(socketId, consumer, kind);
          resolve();
        } catch (error) {
          console.error('[MediaSoup] Error creating consumer:', error);
          reject(error);
        }
      });
    });
  }

  private addToRemoteStream(socketId: string, consumer: Consumer, kind: 'audio' | 'video'): void {
    let remoteStream = this.remoteStreams.get(socketId);

    if (!remoteStream) {
      remoteStream = {
        socketId,
        username: this.peerUsernames.get(socketId) || 'Unknown',
        stream: new MediaStream()
      };
      this.remoteStreams.set(socketId, remoteStream);
    }

    // Add the track to the stream
    remoteStream.stream.addTrack(consumer.track);

    if (kind === 'video') {
      remoteStream.videoConsumer = consumer;
    } else {
      remoteStream.audioConsumer = consumer;
    }

    console.log(`[MediaSoup] Added ${kind} track to remote stream for ${socketId}`);
    console.log('[MediaSoup] Remote stream tracks:', remoteStream.stream.getTracks().map(t => t.kind));

    // Notify about updated streams
    this.onRemoteStream?.(new Map(this.remoteStreams));
  }

  private removeRemoteStream(socketId: string): void {
    const remoteStream = this.remoteStreams.get(socketId);
    if (remoteStream) {
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
}

export const createMediaSoupClient = () => new MediaSoupClient();
