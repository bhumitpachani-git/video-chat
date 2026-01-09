import React, { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from '@/lib/mediasoup';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentSocketId?: string;
  onSendMessage: (message: string) => void;
  onClose: () => void;
}

export function ChatPanel({ messages, currentSocketId, onSendMessage, onClose }: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Chat</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.socketId === currentSocketId;
            return (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col max-w-[85%]',
                  isOwn ? 'ml-auto items-end' : 'items-start'
                )}
              >
                {!isOwn && (
                  <span className="text-xs text-muted-foreground mb-1">{msg.username}</span>
                )}
                <div
                  className={cn(
                    'px-3 py-2 rounded-xl text-sm',
                    isOwn
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-secondary text-secondary-foreground rounded-bl-sm'
                  )}
                >
                  {msg.message}
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button onClick={handleSend} size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
