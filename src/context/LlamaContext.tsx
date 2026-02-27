import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { llamaService, Message } from '../services/LlamaService';

interface LlamaContextType {
  messages: Message[];
  isGenerating: boolean;
  isLoaded: boolean;
  error: string | null;
  loadModel: (path: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  currentModelName: string | null;
}

const LlamaContext = createContext<LlamaContextType | undefined>(undefined);

export const LlamaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(llamaService.isLoaded());
  const [error, setError] = useState<string | null>(null);
  const [currentModelName, setCurrentModelName] = useState<string | null>(null);

  const loadModel = useCallback(async (path: string) => {
    try {
      setError(null);
      await llamaService.loadModel(path);
      setIsLoaded(true);
      setCurrentModelName(path.split('/').pop() || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load model');
      setIsLoaded(false);
      setCurrentModelName(null);
      throw err;
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isGenerating) return;

    const userMessage: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setIsGenerating(true);
    setError(null);

    let assistantContent = '';
    const assistantMessage: Message = { role: 'assistant', content: '' };
    
    setMessages(prev => [...prev, assistantMessage]);

    try {
      await llamaService.generateCompletion(newMessages, (token) => {
        assistantContent += token;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { 
            ...assistantMessage, 
            content: assistantContent 
          };
          return updated;
        });
      });
    } catch (err: any) {
      setError(err.message || 'Error during generation');
    } finally {
      setIsGenerating(false);
    }
  }, [messages, isGenerating]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <LlamaContext.Provider value={{
      messages,
      isGenerating,
      isLoaded,
      error,
      loadModel,
      sendMessage,
      clearChat,
      currentModelName
    }}>
      {children}
    </LlamaContext.Provider>
  );
};

export const useLlamaContext = () => {
  const context = useContext(LlamaContext);
  if (context === undefined) {
    throw new Error('useLlamaContext must be used within a LlamaProvider');
  }
  return context;
};
