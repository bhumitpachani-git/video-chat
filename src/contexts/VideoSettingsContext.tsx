import { createContext, useContext, useState, ReactNode } from 'react';

export interface VideoSettings {
  mirrorVideo: boolean;
  backgroundBlur: boolean;
  backgroundImage: string | null;
}

interface VideoSettingsContextType {
  settings: VideoSettings;
  updateSettings: (settings: Partial<VideoSettings>) => void;
}

const defaultSettings: VideoSettings = {
  mirrorVideo: true,
  backgroundBlur: false,
  backgroundImage: null,
};

const VideoSettingsContext = createContext<VideoSettingsContextType | undefined>(undefined);

export function VideoSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<VideoSettings>(defaultSettings);

  const updateSettings = (newSettings: Partial<VideoSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <VideoSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </VideoSettingsContext.Provider>
  );
}

export function useVideoSettings() {
  const context = useContext(VideoSettingsContext);
  if (!context) {
    throw new Error('useVideoSettings must be used within a VideoSettingsProvider');
  }
  return context;
}
