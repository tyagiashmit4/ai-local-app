import { initWhisper, WhisperContext } from 'react-native-whisper';
import RNFS from 'react-native-fs';

class WhisperService {
  private context: WhisperContext | null = null;
  private modelPath: string | null = null;

  async loadModel(path: string): Promise<void> {
    if (this.context) {
      console.log('[WhisperService] Releasing previous context');
      // react-native-whisper might not have a release() but let's re-init if needed
    }

    const exists = await RNFS.exists(path);
    if (!exists) {
      throw new Error(`Whisper model file not found at: ${path}`);
    }

    console.log(`[WhisperService] Loading model from: ${path}`);
    this.context = await initWhisper({
      filePath: path,
    });
    console.log('[WhisperService] Model loaded successfully');
    this.modelPath = path;
  }

  async transcribe(audioPath: string): Promise<string> {
    if (!this.context) {
      throw new Error('Whisper model not loaded');
    }

    console.log(`[WhisperService] Transcribing audio from: ${audioPath}`);
    const { result, stop } = await this.context.transcribe(audioPath, {
      language: 'en',
      maxTokenCount: 512,
    });

    return result;
  }

  isLoaded(): boolean {
    return !!this.context;
  }

  getModelPath(): string | null {
    return this.modelPath;
  }
}

export const whisperService = new WhisperService();
