import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { whisperService } from '../services/WhisperService';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import { Platform, PermissionsAndroid } from 'react-native';
import { loadSettings } from '../utils/fileSystem';

interface WhisperContextType {
  isRecording: boolean;
  isTranscribing: boolean;
  transcription: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  isWhisperLoaded: boolean;
  loadWhisperModel: (path: string) => Promise<void>;
}

const WhisperContext = createContext<WhisperContextType | undefined>(undefined);

const audioRecorderPlayer = new AudioRecorderPlayer();

export const WhisperProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isWhisperLoaded, setIsWhisperLoaded] = useState(whisperService.isLoaded());

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
    await requestPermissions();
    const path = Platform.select({
      ios: 'whisper_audio.m4a',
      android: `${RNFS.CachesDirectoryPath}/whisper_audio.mp4`,
    });

    const uri = await audioRecorderPlayer.startRecorder(path);
    audioRecorderPlayer.addRecordBackListener((e) => {
      return;
    });
    setIsRecording(true);
    setTranscription('');
    console.log('[WhisperContext] Recording started:', uri);
  };

  const stopRecording = async (): Promise<string> => {
    const result = await audioRecorderPlayer.stopRecorder();
    audioRecorderPlayer.removeRecordBackListener();
    setIsRecording(false);
    console.log('[WhisperContext] Recording stopped:', result);

    if (!whisperService.isLoaded()) {
      return 'Whisper model not loaded';
    }

    try {
      setIsTranscribing(true);
      const text = await whisperService.transcribe(result);
      setTranscription(text);
      return text;
    } catch (err) {
      console.error('[WhisperContext] Transcription error:', err);
      return 'Transcription failed';
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <WhisperContext.Provider value={{
      isRecording,
      isTranscribing,
      transcription,
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
