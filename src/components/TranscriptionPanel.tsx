import React, { useRef, useEffect, useState } from 'react';
import { X, Languages, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface TranscriptEntry {
  id: string;
  socketId: string;
  username: string;
  originalText: string;
  translatedText?: string;
  originalLanguage: string;
  timestamp: Date;
  isFinal: boolean;
}

interface TranscriptionPanelProps {
  transcripts: TranscriptEntry[];
  currentSocketId?: string;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  onClose: () => void;
  isTranscribing: boolean;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' },
];

export function TranscriptionPanel({
  transcripts,
  currentSocketId,
  selectedLanguage,
  onLanguageChange,
  onClose,
  isTranscribing,
}: TranscriptionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const downloadTranscript = () => {
    const content = transcripts
      .filter(t => t.isFinal)
      .map(t => `[${formatTime(t.timestamp)}] ${t.username}: ${t.translatedText || t.originalText}`)
      .join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Languages className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Live Transcription</h2>
          {isTranscribing && (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Language selector */}
      <div className="shrink-0 p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Translate to:</span>
          <Select value={selectedLanguage} onValueChange={onLanguageChange}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transcripts */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {transcripts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Languages className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Transcriptions will appear here</p>
              <p className="text-xs mt-1">Start speaking to see real-time captions</p>
            </div>
          ) : (
            transcripts.map((transcript) => {
              const isOwn = transcript.socketId === currentSocketId;
              return (
                <div
                  key={transcript.id}
                  className={cn(
                    'p-3 rounded-lg',
                    isOwn ? 'bg-primary/10 ml-4' : 'bg-secondary/50 mr-4',
                    !transcript.isFinal && 'opacity-70'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      'text-xs font-medium',
                      isOwn ? 'text-primary' : 'text-foreground'
                    )}>
                      {isOwn ? 'You' : transcript.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(transcript.timestamp)}
                    </span>
                  </div>
                  
                  {/* Translated text */}
                  <p className={cn(
                    'text-sm text-foreground',
                    !transcript.isFinal && 'italic'
                  )}>
                    {transcript.translatedText || transcript.originalText}
                    {!transcript.isFinal && <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />}
                  </p>
                  
                  {/* Original text if different */}
                  {transcript.translatedText && transcript.translatedText !== transcript.originalText && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      Original: {transcript.originalText}
                    </p>
                  )}
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Footer with download */}
      {transcripts.filter(t => t.isFinal).length > 0 && (
        <div className="shrink-0 p-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={downloadTranscript}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Transcript
          </Button>
        </div>
      )}
    </div>
  );
}
