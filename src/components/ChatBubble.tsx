import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Message } from '../services/LlamaService';
import { theme } from '../styles/theme';
import { Download } from 'lucide-react-native';
import { exportToPDF, exportToWord, exportToExcel } from '../utils/exportUtils';
import { Alert, TouchableOpacity } from 'react-native';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  const handleExport = async () => {
    if (!message.exportFormat) return;
    
    try {
      if (message.exportFormat === 'pdf') {
        await exportToPDF(message.content);
      } else if (message.exportFormat === 'word') {
        await exportToWord(message.content);
      } else if (message.exportFormat === 'excel') {
        await exportToExcel(message.content);
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Error', 'Failed to export message.');
    }
  };

  return (
    <View style={[
      styles.container, 
      isUser ? styles.userContainer : styles.assistantContainer
    ]}>
      <View style={[
        styles.bubble, 
        isUser ? styles.userBubble : styles.assistantBubble,
        theme.shadows.soft
      ]}>
        {isUser ? (
          <Text style={styles.userText}>{message.content}</Text>
        ) : (
          <View>
            <Markdown style={markdownStyles}>
              {message.content}
            </Markdown>
            {message.exportFormat && (
              <TouchableOpacity
                style={styles.exportButton}
                onPress={handleExport}
                activeOpacity={0.7}
              >
                <Download size={16} color={theme.colors.primary} />
                <Text style={styles.exportButtonText}>
                  Download {message.exportFormat.toUpperCase()}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const markdownStyles = StyleSheet.create({
  body: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 0,
  },
  code_inline: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: theme.colors.accent,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  code_block: {
    backgroundColor: '#000000',
    color: theme.colors.success,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  fence: {
    backgroundColor: '#000000',
    color: theme.colors.success,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  link: {
    color: theme.colors.primary,
  },
  strong: {
    fontWeight: 'bold',
    color: theme.colors.secondary,
  }
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    flexDirection: 'row',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm, // Reduced vertical padding for better harmony with text
    borderRadius: theme.borderRadius.lg,
  },
  userBubble: {
    backgroundColor: theme.colors.userBubble,
    borderBottomRightRadius: theme.borderRadius.xs,
  },
  assistantBubble: {
    backgroundColor: theme.colors.assistantBubble,
    borderBottomLeftRadius: theme.borderRadius.xs,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  exportButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
  },
});
