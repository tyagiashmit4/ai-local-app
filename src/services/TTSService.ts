import Tts from 'react-native-tts';

type TTSListener = (isSpeaking: boolean) => void;

class TTSService {
  private isInitialized = false;
  private listeners: Set<TTSListener> = new Set();
  private activeUtterances = 0;

  async init() {
    if (this.isInitialized) return;
    try {
      // Set default parameters
      await Tts.getInitStatus();
      Tts.setDefaultRate(0.5);
      Tts.setDefaultPitch(1.0);
      Tts.setDucking(false); // Disable ducking so it doesn't try to kill microphone audio focus
      
      // Optionally listen to events
      Tts.addEventListener('tts-start', () => {
        this.activeUtterances++;
        this.notifyListeners(true);
      });
      Tts.addEventListener('tts-finish', () => {
        this.activeUtterances = Math.max(0, this.activeUtterances - 1);
        if (this.activeUtterances === 0) {
          this.notifyListeners(false);
        }
      });
      Tts.addEventListener('tts-cancel', () => {
        this.activeUtterances = 0;
        this.notifyListeners(false);
      });
      
      this.isInitialized = true;
      console.log('[TTSService] Initialized successfully');
    } catch (err) {
      console.error('[TTSService] Initialization failed', err);
    }
  }

  addListener(listener: TTSListener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notifyListeners(isSpeaking: boolean) {
    this.listeners.forEach(l => l(isSpeaking));
  }

  speak(text: string) {
    if (!this.isInitialized) {
      this.init().then(() => Tts.speak(text));
    } else {
      Tts.speak(text);
    }
  }

  stop() {
    if (this.isInitialized) {
      Tts.stop();
      this.activeUtterances = 0;
      this.notifyListeners(false);
    }
  }
}

export const ttsService = new TTSService();
