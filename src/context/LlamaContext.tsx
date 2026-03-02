import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { llamaService, Message } from '../services/LlamaService';
import { loadSettings, saveSettings, saveChat, listChats, loadChat, deleteChat } from '../utils/fileSystem';

export interface ChatSession {
  id: string;
  messages: Message[];
  updatedAt: number;
  title: string;
}

interface LlamaContextType {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: Message[];
  isGenerating: boolean;
  isLoaded: boolean;
  error: string | null;
  loadModel: (path: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  createNewChat: () => void;
  switchChat: (id: string) => void;
  deleteSessions: (ids: string[]) => Promise<void>;
  currentModelName: string | null;
  isLoadingModel: boolean;
}

const LlamaContext = createContext<LlamaContextType | undefined>(undefined);

const LAST_MODEL_KEY = '@last_model_path';
const ACTIVE_SESSION_KEY = '@active_session_id';

export const LlamaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(llamaService.isLoaded());
  const [error, setError] = useState<string | null>(null);
  const [currentModelName, setCurrentModelName] = useState<string | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);

  // Sync messages with the active session
  useEffect(() => {
    if (activeSessionId) {
      setSessions(prev => prev.map(s => 
        s.id === activeSessionId ? { ...s, messages, updatedAt: Date.now() } : s
      ));
      saveChat(activeSessionId, messages);
    }
  }, [messages, activeSessionId]);

  const loadSessions = useCallback(async () => {
    const files = await listChats();
    const loadedSessions = await Promise.all(
      files.map(async f => {
        const id = f.name.replace('.json', '');
        const msgs = await loadChat(id);
        return {
          id,
          messages: msgs,
          updatedAt: f.mtime?.getTime() || Date.now(),
          title: msgs[0]?.content.substring(0, 30) || 'New Chat'
        };
      })
    );
    // Sort by most recent
    const sorted = loadedSessions.sort((a, b) => b.updatedAt - a.updatedAt);
    setSessions(sorted);
    return sorted;
  }, []);

  const createNewChat = useCallback(async () => {
    const freshId = Date.now().toString();
    const newSession: ChatSession = {
      id: freshId,
      messages: [],
      updatedAt: Date.now(),
      title: 'New Chat'
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(freshId);
    setMessages([]);
    await saveChat(freshId, []);
    const settings = await loadSettings();
    await saveSettings({ ...settings, activeSessionId: freshId });
  }, []);

  const switchChat = useCallback(async (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setActiveSessionId(id);
      setMessages(session.messages);
      const settings = await loadSettings();
      await saveSettings({ ...settings, activeSessionId: id });
    }
  }, [sessions]);

  const deleteSessions = useCallback(async (ids: string[]) => {
    await Promise.all(ids.map(id => deleteChat(id)));
    setSessions(prev => prev.filter(s => !ids.includes(s.id)));
    if (activeSessionId && ids.includes(activeSessionId)) {
      setMessages([]);
      setActiveSessionId(null);
      const settings = await loadSettings();
      await saveSettings({ ...settings, activeSessionId: null });
    }
  }, [activeSessionId]);

  const loadModel = useCallback(async (path: string) => {
    try {
      setIsLoadingModel(true);
      setError(null);
      await llamaService.loadModel(path);
      setIsLoaded(true);
      setCurrentModelName(path.split('/').pop() || null);
      await saveSettings({ lastModelPath: path });
      console.log(`[LlamaContext] Model path saved to RNFS: ${path}`);
    } catch (err: any) {
      setError(err.message || 'Failed to load model');
      setIsLoaded(false);
      setCurrentModelName(null);
      throw err;
    } finally {
      setIsLoadingModel(false);
    }
  }, []);

  // Auto-load last model and session on startup
  useEffect(() => {
    const init = async () => {
      try {
        // Load model
        const settings = await loadSettings();
        if (settings?.lastModelPath) {
          await loadModel(settings.lastModelPath);
        }

        // Load sessions
        const loaded = await loadSessions();
        
        // Load active session
        const lastActiveId = settings?.activeSessionId;
        if (lastActiveId && loaded.find(s => s.id === lastActiveId)) {
          const session = loaded.find(s => s.id === lastActiveId);
          setActiveSessionId(lastActiveId);
          setMessages(session?.messages || []);
        } else if (loaded.length > 0) {
          setActiveSessionId(loaded[0].id);
          setMessages(loaded[0].messages);
        } else {
          await createNewChat();
        }
      } catch (err) {
        console.error('[LlamaContext] Initialization failed:', err);
      }
    };
    init();
  }, [loadModel, loadSessions, createNewChat]);

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

  return (
    <LlamaContext.Provider value={{
      sessions,
      activeSessionId,
      messages,
      isGenerating,
      isLoaded,
      error,
      loadModel,
      sendMessage,
      createNewChat,
      switchChat,
      deleteSessions,
      currentModelName,
      isLoadingModel
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
