import React, { useRef, useEffect } from 'react';
import { X, Languages, Download, Loader2, Globe, Sparkles } from 'lucide-react';
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
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
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
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

  const selectedLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage);

  return (
    <div className="h-full flex flex-col backdrop-blur-xl bg-card/95 border-l border-border/50 shadow-2xl">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Languages className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                Live Transcription
                {isTranscribing && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/20 text-success text-xs font-medium">
                    <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                    Live
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">{transcripts.filter(t => t.isFinal).length} transcripts</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Language selector */}
      <div className="shrink-0 p-3 border-b border-border/50 bg-secondary/10">
        <div className="flex items-center gap-3">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Translate to:</span>
          <Select value={selectedLanguage} onValueChange={onLanguageChange}>
            <SelectTrigger className="flex-1 rounded-xl bg-background/80 border-border/50">
              <SelectValue>
                {selectedLangInfo && (
                  <span className="flex items-center gap-2">
                    <span>{selectedLangInfo.flag}</span>
                    <span>{selectedLangInfo.name}</span>
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
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
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-primary/50" />
              </div>
              <p className="text-muted-foreground font-medium">Transcriptions will appear here</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Start speaking to see real-time captions</p>
            </div>
          ) : (
            transcripts.map((transcript) => {
              const isOwn = transcript.socketId === currentSocketId;
              return (
                <div
                  key={transcript.id}
                  className={cn(
                    'p-4 rounded-2xl transition-all duration-300',
                    isOwn 
                      ? 'bg-primary/10 border border-primary/20 ml-4' 
                      : 'bg-secondary/50 border border-border/30 mr-4',
                    !transcript.isFinal && 'opacity-70'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-md',
                      isOwn ? 'bg-primary/20 text-primary' : 'bg-secondary text-foreground'
                    )}>
                      {isOwn ? 'You' : transcript.username}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatTime(transcript.timestamp)}
                    </span>
                  </div>
                  
                  {/* Translated text */}
                  <p className={cn(
                    'text-sm text-foreground leading-relaxed',
                    !transcript.isFinal && 'italic'
                  )}>
                    {transcript.translatedText || transcript.originalText}
                    {!transcript.isFinal && (
                      <Loader2 className="inline w-3 h-3 ml-2 animate-spin text-primary" />
                    )}
                  </p>
                  
                  {/* Original text if different */}
                  {transcript.translatedText && transcript.translatedText !== transcript.originalText && (
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30 italic">
                      <span className="text-muted-foreground/70">Original:</span> {transcript.originalText}
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
        <div className="shrink-0 p-4 border-t border-border/50 bg-secondary/20">
          <Button
            variant="outline"
            className="w-full rounded-xl h-11 font-medium border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
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
