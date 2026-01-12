import React from 'react';
import { X, Mic, MicOff, Video, VideoOff, Monitor } from 'lucide-react';
import { RemoteStream, ScreenShareStream } from '@/lib/mediasoup';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ParticipantsListProps {
  localUsername: string;
  isLocalVideoEnabled: boolean;
  isLocalAudioEnabled: boolean;
  isLocalScreenSharing: boolean;
  remoteStreams: Map<string, RemoteStream>;
  screenShareStreams: Map<string, ScreenShareStream>;
  onClose: () => void;
}

export function ParticipantsList({
  localUsername,
  isLocalVideoEnabled,
  isLocalAudioEnabled,
  isLocalScreenSharing,
  remoteStreams,
  screenShareStreams,
  onClose,
}: ParticipantsListProps) {
  const participants = [
    {
      id: 'local',
      username: `${localUsername} (You)`,
      isVideoEnabled: isLocalVideoEnabled,
      isAudioEnabled: isLocalAudioEnabled,
      isScreenSharing: isLocalScreenSharing,
    },
    ...Array.from(remoteStreams.values()).map((stream) => ({
      id: stream.socketId,
      username: stream.username,
      isVideoEnabled: stream.stream.getVideoTracks().some(t => t.enabled),
      isAudioEnabled: stream.stream.getAudioTracks().some(t => t.enabled),
      isScreenSharing: screenShareStreams.has(stream.socketId),
    })),
  ];

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Participants ({participants.length})</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Participants list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              {/* Avatar */}
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm',
                getAvatarColor(participant.username)
              )}>
                {getInitial(participant.username)}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{participant.username}</p>
                {participant.isScreenSharing && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Monitor className="w-3 h-3" />
                    Sharing screen
                  </p>
                )}
              </div>

              {/* Status icons */}
              <div className="flex items-center gap-2">
                {participant.isAudioEnabled ? (
                  <Mic className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <MicOff className="w-4 h-4 text-destructive" />
                )}
                {participant.isVideoEnabled ? (
                  <Video className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <VideoOff className="w-4 h-4 text-destructive" />
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
