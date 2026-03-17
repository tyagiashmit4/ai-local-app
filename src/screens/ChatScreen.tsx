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
import { ChatBubble } from '../components/ChatBubble';
import { ChatMenu } from '../components/ChatMenu';
import { Send, Menu, Trash2, Cpu, Mic, Volume2, Square } from 'lucide-react-native';
import { useWhisper } from '../hooks/useWhisper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';

export const ChatScreen = ({ navigation }: any) => {
  const [input, setInput] = useState('');
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const { messages, isGenerating, isLoaded, error, sendMessage, currentModelName, isLoadingModel, stopGeneration } = useLlama();
  const { isRecording, isTranscribing, startRecording, stopRecording, isWhisperLoaded, realtimeText } = useWhisper();

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // 🔥 Keyboard auto scroll fix
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
    return () => show.remove();
  }, []);

  const handleSend = () => {
    const finalInput = isRecording ? displayInput : input;
    if (finalInput.trim() && isLoaded && !isGenerating) {
      sendMessage(finalInput);
      setInput('');
      if (isRecording) {
        stopRecording();
      }
    }
  };

  const handleMicPress = async () => {
    if (isRecording) {
      const text = await stopRecording();
      if (text && text !== 'Transcription failed' && text !== 'Whisper model not loaded') {
        setInput(prev => prev + (prev ? ' ' : '') + text);
      }
    } else {
      if (!isWhisperLoaded) {
        Alert.alert('Whisper Not Ready', 'Please load a Whisper model from the Brain Store first.');
        return;
      }
      await startRecording();
    }
  };

  const displayInput = isRecording && realtimeText 
    ? input + (input ? ' ' : '') + realtimeText 
    : input;

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 🔥 WRAP WHOLE SCREEN */}
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
          // 🔥 MAIN CHAT AREA
          <View style={{ flex: 1 }}>

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(_, index) => index.toString()}
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

            {/* 🔥 STICKY INPUT */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={isLoaded ? (isRecording ? "Listening..." : "Type a prompt...") : "Waiting for model..."}
                placeholderTextColor={theme.colors.textMuted}
                value={displayInput}
                onChangeText={setInput}
                multiline
                editable={isLoaded && !isRecording}
              />

              <TouchableOpacity 
                style={[
                  styles.micButton,
                  isRecording && styles.micButtonActive
                ]}
                onPress={handleMicPress}
                disabled={!isLoaded || isGenerating || isTranscribing}
              >
                {isTranscribing ? (
                  <ActivityIndicator color={theme.colors.primary} size="small" />
                ) : (
                  <Mic color={isRecording ? theme.colors.error : theme.colors.textMuted} size={20} />
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.sendButton, 
                  (!displayInput.trim() || !isLoaded) && !isGenerating && styles.sendButtonDisabled
                ]}
                onPress={isGenerating ? stopGeneration : handleSend}
                disabled={(!displayInput.trim() || !isLoaded) && !isGenerating}
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 100,
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
    marginRight: 10,
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
    marginRight: 8,
  },
  micButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
});
