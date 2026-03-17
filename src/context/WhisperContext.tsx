import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { whisperService } from '../services/WhisperService';
import { Platform, PermissionsAndroid } from 'react-native';
import { loadSettings } from '../utils/fileSystem';

interface WhisperContextType {
  isRecording: boolean;
  isTranscribing: boolean;
  transcription: string;
  realtimeText: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  isWhisperLoaded: boolean;
  loadWhisperModel: (path: string) => Promise<void>;
}

const WhisperContext = createContext<WhisperContextType | undefined>(undefined);

export const WhisperProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false); // Can be kept for compatibility
  const [transcription, setTranscription] = useState('');
  const [realtimeText, setRealtimeText] = useState('');
  const [isWhisperLoaded, setIsWhisperLoaded] = useState(whisperService.isLoaded());
  const stopRealtimeRef = useRef<(() => Promise<void>) | null>(null);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        if (
          grants['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('Permissions granted');
        } else {
          console.log('Permissions denied');
          return;
        }
      } catch (err) {
        console.warn(err);
        return;
      }
    }
  };

  const loadWhisperModel = useCallback(async (path: string) => {
    try {
      await whisperService.loadModel(path);
      setIsWhisperLoaded(true);
    } catch (err) {
      console.error('[WhisperContext] Failed to load model:', err);
      setIsWhisperLoaded(false);
      throw err;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const settings = await loadSettings();
      if (settings?.lastWhisperModelPath) {
        await loadWhisperModel(settings.lastWhisperModelPath);
      }
    };
    init();
  }, [loadWhisperModel]);

  const startRecording = async () => {
    if (!whisperService.isLoaded()) {
      console.error('[WhisperContext] Whisper model not loaded');
      return;
    }
    
    await requestPermissions();
    setIsRecording(true);
    setRealtimeText('');
    setTranscription('');
    
    try {
      const stop = await whisperService.transcribeRealtime(
        (text) => {
          setRealtimeText(text);
        },
        (finalText) => {
          setRealtimeText(finalText);
          setTranscription(finalText);
          setIsRecording(false);
        }
      );
      stopRealtimeRef.current = stop;
      console.log('[WhisperContext] Realtime recording started');
    } catch (err) {
      console.error('[WhisperContext] Failed to start realtime transcription:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = async (): Promise<string> => {
    if (stopRealtimeRef.current) {
      try {
        await stopRealtimeRef.current();
      } catch (err) {
        console.error('[WhisperContext] Error stopping realtime transcription:', err);
      }
      stopRealtimeRef.current = null;
    }
    
    setIsRecording(false);
    setTranscription(realtimeText);
    console.log('[WhisperContext] Realtime recording stopped. Text:', realtimeText);
    return realtimeText;
  };

  return (
    <WhisperContext.Provider value={{
      isRecording,
      isTranscribing,
      transcription,
      realtimeText,
      startRecording,
      stopRecording,
      isWhisperLoaded,
      loadWhisperModel,
    }}>
      {children}
    </WhisperContext.Provider>
  );
};

export const useWhisperContext = () => {
  const context = useContext(WhisperContext);
  if (context === undefined) {
    throw new Error('useWhisperContext must be used within a WhisperProvider');
  }
  return context;
};
