import { useState, useEffect } from 'react';
import { ttsService } from '../services/TTSService';

export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const unsubscribe = ttsService.addListener((speaking) => {
      setIsSpeaking(speaking);
    });
    return unsubscribe;
  }, []);

  return { isSpeaking };
};
