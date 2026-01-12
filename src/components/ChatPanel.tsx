import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from '@/lib/mediasoup';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  // Get avatar color from username
  const getAvatarColor = (username: string) => {
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <div className="flex flex-col h-full glass-panel">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between p-4 border-b border-border/30 glass-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/20">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Chat</h3>
            <p className="text-xs text-muted-foreground">{messages.length} messages</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors backdrop-blur-sm"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted/30 backdrop-blur-sm flex items-center justify-center mb-4 border border-border/30">
              <MessageCircle className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">No messages yet</p>
            <p className="text-muted-foreground/70 text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isOwn = msg.socketId === currentSocketId;
              const showAvatar = index === 0 || messages[index - 1].socketId !== msg.socketId;
              
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-3',
                    isOwn ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar */}
                  {!isOwn && showAvatar ? (
                    <div 
                      className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-semibold shadow-lg ring-2 ring-background/50"
                      style={{ backgroundColor: getAvatarColor(msg.username) }}
                    >
                      {msg.username.charAt(0).toUpperCase()}
                    </div>
                  ) : !isOwn ? (
                    <div className="w-8" />
                  ) : null}
                  
                  <div className={cn(
                    'flex flex-col max-w-[75%]',
                    isOwn ? 'items-end' : 'items-start'
                  )}>
                    {!isOwn && showAvatar && (
                      <span className="text-xs text-muted-foreground mb-1 ml-1 font-medium">
                        {msg.username}
                      </span>
                    )}
                    <div
                      className={cn(
                        'px-4 py-2.5 rounded-2xl text-sm shadow-lg backdrop-blur-sm',
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-secondary/80 text-secondary-foreground rounded-bl-md border border-border/30'
                      )}
                    >
                      {msg.message}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 mx-1">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 p-4 border-t border-border/30 glass-footer">
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="pr-10 rounded-xl bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary focus:ring-primary/20"
            />
          </div>
          <Button 
            onClick={handleSend} 
            size="icon" 
            disabled={!newMessage.trim()}
            className="rounded-xl h-10 w-10 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
