import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { whisperService } from '../services/WhisperService';
import { Platform, PermissionsAndroid } from 'react-native';
import { loadSettings } from '../utils/fileSystem';

interface WhisperContextType {
  isRecording: boolean;
  isTranscribing: boolean;
  isPaused: boolean;
  transcription: string;
  realtimeText: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  isWhisperLoaded: boolean;
  loadWhisperModel: (path: string) => Promise<void>;
}

const WhisperContext = createContext<WhisperContextType | undefined>(undefined);

export const WhisperProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [realtimeText, setRealtimeText] = useState('');
  const [isWhisperLoaded, setIsWhisperLoaded] = useState(whisperService.isLoaded());
  const stopRealtimeRef = useRef<(() => Promise<void>) | null>(null);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('[WhisperContext] RECORD_AUDIO permission granted');
          return true;
        } else {
          console.log('[WhisperContext] RECORD_AUDIO permission denied');
          return false;
        }
      } catch (err) {
        console.warn('[WhisperContext] Permission request error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions via Info.plist
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

  const startRecording = useCallback(async () => {
    if (!whisperService.isLoaded()) {
      console.error('[WhisperContext] Whisper model not loaded');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.error('[WhisperContext] Mic permission denied, cannot record');
      return;
    }

    // Stop any existing capture session first to avoid "already in capturing" error
    if (stopRealtimeRef.current) {
      console.log('[WhisperContext] Stopping previous capture session before starting new one');
      try {
        await stopRealtimeRef.current();
      } catch (err) {
        console.warn('[WhisperContext] Error stopping previous session:', err);
      }
      stopRealtimeRef.current = null;
      // Small delay to let whisper fully release the audio session
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsRecording(true);
    setIsPaused(false);
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
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    if (stopRealtimeRef.current) {
      try {
        await stopRealtimeRef.current();
      } catch (err) {
        console.error('[WhisperContext] Error stopping realtime transcription:', err);
      }
      stopRealtimeRef.current = null;
    }
    
    const currentText = realtimeText;
    setIsRecording(false);
    setIsPaused(false);
    setTranscription(currentText);
    console.log('[WhisperContext] Realtime recording stopped. Text:', currentText);
    return currentText;
  }, [realtimeText]);

  // Pause: stop the actual mic/whisper session but keep voice mode active
  const pauseRecording = useCallback(async () => {
    if (!isRecording || isPaused) return;
    
    console.log('[WhisperContext] Pausing recording (stopping whisper session)');
    if (stopRealtimeRef.current) {
      try {
        await stopRealtimeRef.current();
      } catch (err) {
        console.error('[WhisperContext] Error pausing:', err);
      }
      stopRealtimeRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(true);
  }, [isRecording, isPaused]);

  // Resume: restart the whisper session
  const resumeRecording = useCallback(async () => {
    if (!isPaused) return;
    if (!whisperService.isLoaded()) return;

    console.log('[WhisperContext] Resuming recording');
    setIsPaused(false);
    setIsRecording(true);
    setRealtimeText('');

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
      console.log('[WhisperContext] Recording resumed');
    } catch (err) {
      console.error('[WhisperContext] Failed to resume recording:', err);
      setIsRecording(false);
      setIsPaused(false);
    }
  }, [isPaused]);

  return (
    <WhisperContext.Provider value={{
      isRecording,
      isTranscribing,
      isPaused,
      transcription,
      realtimeText,
      startRecording,
      stopRecording,
      pauseRecording,
      resumeRecording,
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
