import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Platform,
  Text,
  ActivityIndicator,
  LayoutAnimation,
  Alert,
  KeyboardAvoidingView,
  Keyboard
} from 'react-native';
import { useLlama } from '../hooks/useLlama';
import { useWhisper } from '../hooks/useWhisper';
import { useTTS } from '../hooks/useTTS';
import { ChatBubble } from '../components/ChatBubble';
import { ChatMenu } from '../components/ChatMenu';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { VoiceWaveAnimation } from '../components/VoiceWaveAnimation';
import { ttsService } from '../services/TTSService';
import { documentService, ParsedDocument } from '../services/DocumentService';
import { Cpu, FileText, Menu, Mic, Paperclip, Send, Square, X } from 'lucide-react-native';


export const ChatScreen = ({ navigation }: any) => {
  const [input, setInput] = useState('');
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const { messages, isGenerating, isLoaded, error, sendMessage, currentModelName, isLoadingModel, stopGeneration } = useLlama();
  const { isRecording, isTranscribing, startRecording, stopRecording, pauseRecording, resumeRecording, isWhisperLoaded, realtimeText, isPaused } = useWhisper();
  const { isSpeaking } = useTTS();

  const flatListRef = useRef<FlatList>(null);

  // ── Voice Mode State ──
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTransitioningRef = useRef(false);
  const prevRealtimeTextRef = useRef('');
  const hasSentFirstMessageRef = useRef(false); // tracks if we've sent at least one message in this voice session

  // ── Document Attachment State ──
  const [attachedDoc, setAttachedDoc] = useState<ParsedDocument | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);

  useEffect(() => {
    if (messages.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Keyboard auto scroll fix
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
    return () => show.remove();
  }, []);

  // ── Restart mic fresh when AI finishes (clears any AI audio that was captured) ──
  useEffect(() => {
    if (!isVoiceMode) return;
    if (isTransitioningRef.current) return;

    // AI just finished and mic is not active — restart recording fresh
    if (!isGenerating && !isSpeaking && !isRecording && isWhisperLoaded && hasSentFirstMessageRef.current) {
      console.log('[ChatScreen] AI finished. Restarting mic fresh...');
      isTransitioningRef.current = true;
      // Delay to let TTS audio fully stop before mic picks up
      setTimeout(() => {
        startRecording().finally(() => {
          setTimeout(() => {
            isTransitioningRef.current = false;
          }, 500);
        });
      }, 800);
    }
  }, [isGenerating, isSpeaking, isRecording, isVoiceMode, isWhisperLoaded, startRecording]);

  // ── Interrupt-on-speak: if user speaks while AI is talking, stop AI immediately ──
  useEffect(() => {
    if (!isVoiceMode || !isRecording) return;
    if (!realtimeText.trim()) return;
    
    // If AI is still generating or speaking, interrupt it
    if (isGenerating || isSpeaking) {
      console.log('[ChatScreen] User spoke while AI is responding — interrupting AI');
      if (isGenerating) {
        stopGeneration();
      }
      if (isSpeaking) {
        ttsService.stop();
      }
    }
  }, [realtimeText, isVoiceMode, isRecording, isGenerating, isSpeaking, stopGeneration]);

  // ── Silence detection: auto-send after 1.5s of no new speech ──
  useEffect(() => {
    if (!isVoiceMode || !isRecording || !realtimeText.trim()) return;

    // Don't auto-send while AI is still generating (user just interrupted, let them finish speaking)
    if (isGenerating) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      console.log('[ChatScreen] Silence detected, auto-sending message...');
      const text = await stopRecording();
      if (text && text !== 'Transcription failed' && text !== 'Whisper model not loaded') {
        if (text.trim() && isLoaded) {
          hasSentFirstMessageRef.current = true;
          sendMessage(text.trim(), true);
        }
      }
    }, 1500);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [realtimeText, isVoiceMode, isRecording, isLoaded, isGenerating, sendMessage, stopRecording]);

  // ── Handle entering/exiting voice mode via mic button ──
  const handleMicPress = async () => {
    // If already in voice mode, exit it
    if (isVoiceMode) {
      console.log('[ChatScreen] Exiting voice mode');
      setIsVoiceMode(false);
      hasSentFirstMessageRef.current = false;
      if (isRecording) {
        await stopRecording();
      }
      if (isGenerating) {
        await stopGeneration();
      }
      if (isSpeaking) {
        ttsService.stop();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      return;
    }

    // Enter voice mode
    if (!isWhisperLoaded) {
      Alert.alert('Whisper Not Ready', 'Please load a Whisper model from the Brain Store first.');
      return;
    }

    console.log('[ChatScreen] Entering voice mode');
    setIsVoiceMode(true);
    setInput('');
    
    // If AI is currently speaking, stop it
    if (isGenerating) {
      await stopGeneration();
    }
    if (isSpeaking) {
      ttsService.stop();
    }

    // Start listening
    await startRecording();
  };

  const handleSend = () => {
    // If we have an attached document and/or input text, we can send.
    if ((input.trim() || attachedDoc) && isLoaded && !isGenerating) {
      let finalMessage = input.trim();
      
      if (attachedDoc) {
        finalMessage = `Context from attached document "${attachedDoc.name}":\n\n${attachedDoc.text}\n\nUser Question/Input: ${finalMessage || 'Please summarize this document.'}`;
      }
      
      sendMessage(finalMessage, false);
      setInput('');
      setAttachedDoc(null);
    }
  };

  const handleAttach = async () => {
    try {
      setIsAttaching(true);
      const doc = await documentService.pickDocument();
      if (doc) {
        const parsed = await documentService.extractText(doc);
        setAttachedDoc(parsed);
      }
    } catch (err: any) {
      Alert.alert('Attachment Error', err.message || 'Could not attach document.');
    } finally {
      setIsAttaching(false);
    }
  };

  // Determine voice mode status text
  const getVoiceModeStatus = () => {
    if (isRecording && realtimeText.trim()) return 'Listening...';
    if (isRecording) return 'Listening...';
    if (isGenerating) return 'AI is thinking...';
    if (isSpeaking) return 'AI is speaking...';
    if (isPaused) return 'Waiting for AI...';
    return 'Starting...';
  };

  return (
    <SafeAreaView style={styles.container}>
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >

        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Llama AI</Text>
            {isLoaded && (
              <View style={styles.modelStatus}>
                <Cpu size={12} color={theme.colors.success} />
                <Text style={styles.modelName}>{currentModelName}</Text>
              </View>
            )}
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => setIsMenuVisible(true)} 
              style={styles.iconButton}
            >
              <Menu color={theme.colors.primary} size={24} />
            </TouchableOpacity>
          </View>
        </View>

        <ChatMenu 
          isVisible={isMenuVisible} 
          onClose={() => setIsMenuVisible(false)} 
          navigation={navigation}
        />

        {/* STATES */}
        {isLoadingModel ? (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Infusing Brain...</Text>
              <Text style={styles.loadingSubtext}>Loading model into RAM. Please wait.</Text>
            </View>
          </View>
        ) : !isLoaded ? (
          <View style={styles.emptyState}>
            <Cpu size={64} color={theme.colors.surface} />
            <Text style={styles.emptyText}>No Brain Detected</Text>
            <Text style={styles.emptySubtext}>Load a local model to start chatting offline.</Text>
            <TouchableOpacity 
              style={styles.loadButton}
              onPress={() => navigation.navigate('Models')}
            >
              <Text style={styles.loadButtonText}>Go to Brain Store</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1 }}>

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(_: any, index: { toString: () => any; }) => index.toString()}
              renderItem={({ item }) => <ChatBubble message={item} />}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
            />

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* ── VOICE MODE OVERLAY ── */}
            {isVoiceMode ? (
              <View style={styles.voiceModeContainer}>
                {/* Realtime transcription text */}
                {realtimeText.trim() ? (
                  <Text style={styles.voiceTranscriptText} numberOfLines={3}>
                    {realtimeText}
                  </Text>
                ) : null}

                {/* Wave Animation or Status */}
                <View style={styles.voiceWaveRow}>
                  {isRecording ? (
                    <VoiceWaveAnimation 
                      isActive={true} 
                      color={theme.colors.primary}
                      width={160}
                      height={50}
                    />
                  ) : (
                    <VoiceWaveAnimation 
                      isActive={false} 
                      color={theme.colors.textMuted}
                      width={160}
                      height={50}
                    />
                  )}
                </View>

                {/* Status Text */}
                <Text style={[
                  styles.voiceStatusText,
                  (isGenerating || isSpeaking) && styles.voiceStatusAI
                ]}>
                  {getVoiceModeStatus()}
                </Text>

                {/* Exit Voice Mode Button */}
                <TouchableOpacity 
                  style={styles.voiceExitButton}
                  onPress={handleMicPress}
                >
                  <X color="#FFFFFF" size={24} />
                </TouchableOpacity>
              </View>
            ) : (
              /* ── NORMAL INPUT BAR ── */
              <View>
                {/* ATTACHMENT PREVIEW */}
                {attachedDoc && (
                  <View style={styles.attachmentPreview}>
                    <FileText color={theme.colors.primary} size={20} />
                    <View style={styles.attachmentTextContainer}>
                      <Text style={styles.attachmentName} numberOfLines={1}>{attachedDoc.name}</Text>
                      <Text style={styles.attachmentType}>{Math.round(attachedDoc.text.length / 1024)}KB text extracted</Text>
                    </View>
                    <TouchableOpacity onPress={() => setAttachedDoc(null)} style={styles.attachmentRemove}>
                      <X color={theme.colors.textMuted} size={18} />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <TouchableOpacity 
                    style={styles.attachButton}
                    onPress={handleAttach}
                    disabled={!isLoaded || isAttaching}
                  >
                    {isAttaching ? (
                      <ActivityIndicator color={theme.colors.primary} size="small" />
                    ) : (
                      <Paperclip color={theme.colors.textMuted} size={22} style={{ transform: [{ rotate: '45deg' }] }} />
                    )}
                  </TouchableOpacity>

                  <TextInput
                    style={styles.input}
                    placeholder={isLoaded ? "Type a prompt..." : "Waiting for model..."}
                    placeholderTextColor={theme.colors.textMuted}
                    value={input}
                    onChangeText={setInput}
                    multiline
                    editable={isLoaded}
                  />

                <TouchableOpacity 
                  style={styles.micButton}
                  onPress={handleMicPress}
                  disabled={!isLoaded || isTranscribing}
                >
                  {isTranscribing ? (
                    <ActivityIndicator color={theme.colors.primary} size="small" />
                  ) : (
                    <Mic color={theme.colors.textMuted} size={20} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.sendButton, 
                    (!input.trim() || !isLoaded) && !isGenerating && styles.sendButtonDisabled
                  ]}
                  onPress={isGenerating ? stopGeneration : handleSend}
                  disabled={(!input.trim() || !isLoaded) && !isGenerating}
                >
                  {isGenerating ? (
                    <Square color="#FFFFFF" size={20} fill="#FFFFFF" />
                  ) : (
                    <Send color="#FFFFFF" size={20} />
                  )}
                </TouchableOpacity>
              </View>
             </View>
            )}

          </View>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.soft,
  },
  headerTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    color: theme.colors.text,
  },
  modelStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  modelName: {
    fontSize: 10,
    color: theme.colors.success,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 16,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  listContent: {
    paddingVertical: theme.spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 100,
  },
  attachButton: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 45,
    maxHeight: 120,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text,
    marginRight: 6,
    marginLeft: 4,
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surface,
    opacity: 0.5,
  },
  micButton: {
    width: 45,
    height: 45,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  attachmentTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  attachmentName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  attachmentType: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  attachmentRemove: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  loadButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
  },
  loadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  loadingContent: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
  },
  loadingSubtext: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  // ── Voice Mode Styles ──
  voiceModeContainer: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 20,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    minHeight: 160,
  },
  voiceTranscriptText: {
    color: theme.colors.text,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    fontStyle: 'italic',
    opacity: 0.9,
  },
  voiceWaveRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  voiceStatusText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  voiceStatusAI: {
    color: theme.colors.secondary,
  },
  voiceExitButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: theme.colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
