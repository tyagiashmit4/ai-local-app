import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  Text,
  ActivityIndicator,
  LayoutAnimation,
} from 'react-native';
import { useLlama } from '../hooks/useLlama';
import { ChatBubble } from '../components/ChatBubble';
import { ChatMenu } from '../components/ChatMenu';
import { Send, Menu, Trash2, Cpu } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';

export const ChatScreen = ({ navigation }: any) => {
  const [input, setInput] = useState('');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const { messages, isGenerating, isLoaded, error, sendMessage, currentModelName } = useLlama();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      // Smooth layout animation for new messages
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && isLoaded && !isGenerating) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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

      {!isLoaded && (
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
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={isLoaded ? "Type a prompt..." : "Waiting for model..."}
            placeholderTextColor={theme.colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            editable={isLoaded && !isGenerating}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton, 
              (!input.trim() || !isLoaded || isGenerating) && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!input.trim() || !isLoaded || isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Send color="#FFFFFF" size={20} />
            )}
          </TouchableOpacity>
        </View>
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
});
