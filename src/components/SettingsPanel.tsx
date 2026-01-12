import React, { useState, useEffect } from 'react';
import { X, Camera, Mic, Volume2, Monitor } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Settings</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Settings content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Video Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Video
            </h3>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Camera</Label>
                <Select
                  value={selectedDevices.videoInput}
                  onValueChange={(value) => setSelectedDevices(prev => ({ ...prev, videoInput: value }))}
                >
                  <SelectTrigger className="w-full">
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

              <div className="flex items-center justify-between">
                <Label className="text-sm">Mirror video</Label>
                <Switch
                  checked={settings.mirrorVideo}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, mirrorVideo: checked }))}
                />
              </div>
            </div>
          </div>

          {/* Audio Input Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Microphone
            </h3>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Microphone</Label>
                <Select
                  value={selectedDevices.audioInput}
                  onValueChange={(value) => setSelectedDevices(prev => ({ ...prev, audioInput: value }))}
                >
                  <SelectTrigger className="w-full">
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

              <div className="flex items-center justify-between">
                <Label className="text-sm">Noise cancellation</Label>
                <Switch
                  checked={settings.noiseCancellation}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, noiseCancellation: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Echo cancellation</Label>
                <Switch
                  checked={settings.echoCancellation}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, echoCancellation: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Auto gain control</Label>
                <Switch
                  checked={settings.autoGainControl}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoGainControl: checked }))}
                />
              </div>
            </div>
          </div>

          {/* Audio Output Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Speaker
            </h3>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Speaker</Label>
                <Select
                  value={selectedDevices.audioOutput}
                  onValueChange={(value) => setSelectedDevices(prev => ({ ...prev, audioOutput: value }))}
                >
                  <SelectTrigger className="w-full">
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
        </div>
      </ScrollArea>
    </div>
  );
}
