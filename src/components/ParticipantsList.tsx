import React from 'react';
import { X, Mic, MicOff, Video, VideoOff, Monitor, Volume2, Shield, MoreVertical } from 'lucide-react';
import { RemoteStream, ScreenShareStream } from '@/lib/mediasoup';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ParticipantsListProps {
  localUsername: string;
  isLocalVideoEnabled: boolean;
  isLocalAudioEnabled: boolean;
  isLocalScreenSharing: boolean;
  isHost: boolean;
  remoteStreams: Map<string, RemoteStream>;
  screenShareStreams: Map<string, ScreenShareStream>;
  onClose: () => void;
  onMuteParticipant?: (socketId: string, kind: 'audio' | 'video') => void;
}

export function ParticipantsList({
  localUsername,
  isLocalVideoEnabled,
  isLocalAudioEnabled,
  isLocalScreenSharing,
  isHost,
  remoteStreams,
  screenShareStreams,
  onClose,
  onMuteParticipant,
}: ParticipantsListProps) {
  // Get actual status from streams
  const getRemoteStatus = (stream: RemoteStream) => {
    const audioTracks = stream.stream.getAudioTracks();
    const videoTracks = stream.stream.getVideoTracks();
    
    return {
      isAudioEnabled: audioTracks.some(t => t.readyState === 'live' && t.enabled),
      isVideoEnabled: videoTracks.some(t => t.readyState === 'live' && t.enabled),
    };
  };

  const participants = [
    {
      id: 'local',
      username: localUsername,
      isYou: true,
      isHost: isHost,
      isVideoEnabled: isLocalVideoEnabled,
      isAudioEnabled: isLocalAudioEnabled,
      isScreenSharing: isLocalScreenSharing,
    },
    ...Array.from(remoteStreams.values()).map((stream) => {
      const status = getRemoteStatus(stream);
      return {
        id: stream.socketId,
        username: stream.username,
        isYou: false,
        isHost: false, // We'd need to sync this from server properly for remote peers
        isVideoEnabled: status.isVideoEnabled,
        isAudioEnabled: status.isAudioEnabled,
        isScreenSharing: screenShareStreams.has(stream.socketId),
      };
    }),
  ];

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 45%)`;
  };

  return (
    <div className="flex flex-col h-full glass-panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30 glass-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/20">
            <Volume2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Participants</h2>
            <p className="text-xs text-muted-foreground">{participants.length} in call</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Participants list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl transition-all backdrop-blur-sm',
                'hover:bg-muted/30 border border-transparent hover:border-border/30',
                participant.isYou && 'bg-primary/5 border-primary/20'
              )}
            >
              {/* Avatar */}
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ring-2 ring-background/50 shadow-lg"
                style={{ backgroundColor: getAvatarColor(participant.username) }}
              >
                {getInitial(participant.username)}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-2">
                  {participant.username}
                  {participant.isYou && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                      You
                    </span>
                  )}
                  {participant.isHost && (
                    <Shield className="w-3.5 h-3.5 text-yellow-500" title="Host" />
                  )}
                </p>
                {participant.isScreenSharing && (
                  <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                    <Monitor className="w-3 h-3" />
                    Sharing screen
                  </p>
                )}
              </div>

              {/* Actions for Host */}
              {isHost && !participant.isYou && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem 
                      className="gap-2 cursor-pointer"
                      onClick={() => onMuteParticipant?.(participant.id, 'audio')}
                    >
                      <MicOff className="w-4 h-4" />
                      Mute Audio
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => onMuteParticipant?.(participant.id, 'video')}
                    >
                      <VideoOff className="w-4 h-4" />
                      Stop Video
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Status icons */}
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                  participant.isAudioEnabled 
                    ? "bg-success/20 text-success" 
                    : "bg-destructive/20 text-destructive"
                )}>
                  {participant.isAudioEnabled ? (
                    <Mic className="w-3.5 h-3.5" />
                  ) : (
                    <MicOff className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                  participant.isVideoEnabled 
                    ? "bg-success/20 text-success" 
                    : "bg-destructive/20 text-destructive"
                )}>
                  {participant.isVideoEnabled ? (
                    <Video className="w-3.5 h-3.5" />
                  ) : (
                    <VideoOff className="w-3.5 h-3.5" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
