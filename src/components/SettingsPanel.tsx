import React, { useState, useEffect } from 'react';
import { X, Camera, Mic, Volume2, Shield, Sliders } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [devices, setDevices] = useState<{
    audioInput: MediaDeviceInfo[];
    audioOutput: MediaDeviceInfo[];
    videoInput: MediaDeviceInfo[];
  }>({
    audioInput: [],
    audioOutput: [],
    videoInput: [],
  });

  const [selectedDevices, setSelectedDevices] = useState({
    audioInput: '',
    audioOutput: '',
    videoInput: '',
  });

  const [settings, setSettings] = useState({
    noiseCancellation: true,
    echoCancellation: true,
    autoGainControl: true,
    mirrorVideo: true,
    highQualityAudio: true,
    backgroundBlur: false,
  });

  useEffect(() => {
    async function getDevices() {
      try {
        // Request permissions first
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        
        setDevices({
          audioInput: deviceList.filter(d => d.kind === 'audioinput'),
          audioOutput: deviceList.filter(d => d.kind === 'audiooutput'),
          videoInput: deviceList.filter(d => d.kind === 'videoinput'),
        });
      } catch (error) {
        console.error('Error getting devices:', error);
      }
    }
    
    getDevices();
  }, []);

  const SettingSwitch = ({ 
    label, 
    description, 
    checked, 
    onCheckedChange 
  }: { 
    label: string; 
    description?: string;
    checked: boolean; 
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );

  return (
    <div className="flex flex-col h-full glass-panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30 glass-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/20">
            <Sliders className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Settings</h2>
            <p className="text-xs text-muted-foreground">Configure your call</p>
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

      {/* Settings content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Video Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Camera className="w-4 h-4 text-primary" />
              Video
            </div>
            
            <div className="space-y-3 pl-6">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Camera</Label>
                <Select
                  value={selectedDevices.videoInput}
                  onValueChange={(value) => setSelectedDevices(prev => ({ ...prev, videoInput: value }))}
                >
                  <SelectTrigger className="w-full rounded-xl bg-background/50 backdrop-blur-sm border-border/50">
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.videoInput.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SettingSwitch
                label="Mirror video"
                description="Flip your video horizontally"
                checked={settings.mirrorVideo}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, mirrorVideo: checked }))}
              />

              <SettingSwitch
                label="Background blur"
                description="Blur your background"
                checked={settings.backgroundBlur}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, backgroundBlur: checked }))}
              />
            </div>
          </div>

          {/* Audio Input Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Mic className="w-4 h-4 text-primary" />
              Microphone
            </div>
            
            <div className="space-y-3 pl-6">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Microphone</Label>
                <Select
                  value={selectedDevices.audioInput}
                  onValueChange={(value) => setSelectedDevices(prev => ({ ...prev, audioInput: value }))}
                >
                  <SelectTrigger className="w-full rounded-xl bg-background/50 backdrop-blur-sm border-border/50">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.audioInput.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SettingSwitch
                label="Noise cancellation"
                description="Reduce background noise"
                checked={settings.noiseCancellation}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, noiseCancellation: checked }))}
              />

              <SettingSwitch
                label="Echo cancellation"
                description="Prevent audio feedback"
                checked={settings.echoCancellation}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, echoCancellation: checked }))}
              />

              <SettingSwitch
                label="Auto gain control"
                description="Automatically adjust volume"
                checked={settings.autoGainControl}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoGainControl: checked }))}
              />

              <SettingSwitch
                label="High quality audio"
                description="Use 48kHz sample rate"
                checked={settings.highQualityAudio}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, highQualityAudio: checked }))}
              />
            </div>
          </div>

          {/* Audio Output Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Volume2 className="w-4 h-4 text-primary" />
              Speaker
            </div>
            
            <div className="space-y-3 pl-6">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Speaker</Label>
                <Select
                  value={selectedDevices.audioOutput}
                  onValueChange={(value) => setSelectedDevices(prev => ({ ...prev, audioOutput: value }))}
                >
                  <SelectTrigger className="w-full rounded-xl bg-background/50 backdrop-blur-sm border-border/50">
                    <SelectValue placeholder="Select speaker" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.audioOutput.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Privacy info */}
          <div className="p-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/30">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Privacy Protected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All audio processing happens locally on your device. No data is sent to external servers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
