import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  Pressable,
  Alert
} from 'react-native';
import { 
  Plus, 
  Settings, 
  Trash2, 
  X, 
  CheckSquare, 
  Square,
  MessageSquare,
  ChevronRight
} from 'lucide-react-native';
import { useLlama } from '../hooks/useLlama';
import { theme } from '../styles/theme';
import { ChatSession } from '../context/LlamaContext';

interface ChatMenuProps {
  isVisible: boolean;
  onClose: () => void;
  navigation: any;
}

export const ChatMenu: React.FC<ChatMenuProps> = ({ isVisible, onClose, navigation }) => {
  const { sessions, activeSessionId, createNewChat, switchChat, deleteSessions } = useLlama();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleNewChat = () => {
    createNewChat();
    onClose();
  };

  const handleGoToSettings = () => {
    onClose();
    navigation.navigate('Models');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    
    Alert.alert(
      'Delete Chats',
      `Are you sure you want to delete ${selectedIds.length} chat(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            await deleteSessions(selectedIds);
            setSelectedIds([]);
            setIsEditMode(false);
          }
        }
      ]
    );
  };

  const renderChatItem = ({ item }: { item: ChatSession }) => {
    const isActive = item.id === activeSessionId;
    const isSelected = selectedIds.includes(item.id);

    return (
      <TouchableOpacity 
        style={[styles.chatItem, isActive && styles.activeChatItem]}
        onPress={() => isEditMode ? toggleSelect(item.id) : (switchChat(item.id), onClose())}
      >
        <View style={styles.chatInfo}>
          {isEditMode ? (
            isSelected ? (
              <CheckSquare size={20} color={theme.colors.error} style={styles.icon} />
            ) : (
              <Square size={20} color={theme.colors.textMuted} style={styles.icon} />
            )
          ) : (
            <MessageSquare size={20} color={isActive ? theme.colors.primary : theme.colors.textMuted} style={styles.icon} />
          )}
          <View>
            <Text style={[styles.chatTitle, isActive && styles.activeChatText]} numberOfLines={1}>
              {item.title || 'Empty Brainstorm'}
            </Text>
            <Text style={styles.chatMeta}>
              {new Date(item.updatedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {!isEditMode && <ChevronRight size={16} color={theme.colors.textMuted} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.menuContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Neural History</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleNewChat}>
              <View style={[styles.actionIcon, { backgroundColor: theme.colors.primary }]}>
                <Plus size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.actionText}>New Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleGoToSettings}>
              <View style={[styles.actionIcon, { backgroundColor: theme.colors.surface }]}>
                <Settings size={20} color={theme.colors.text} />
              </View>
              <Text style={styles.actionText}>Neural Store</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Conversations</Text>
            <TouchableOpacity 
              onPress={() => {
                setIsEditMode(!isEditMode);
                setSelectedIds([]);
              }}
            >
              <Text style={[styles.editButton, isEditMode && { color: theme.colors.primary }]}>
                {isEditMode ? 'Done' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={sessions}
            keyExtractor={item => item.id}
            renderItem={renderChatItem}
            contentContainerStyle={styles.listContent}
          />

          {isEditMode && selectedIds.length > 0 && (
            <TouchableOpacity style={styles.deleteSelectionBar} onPress={handleDelete}>
              <Trash2 size={20} color="#FFFFFF" />
              <Text style={styles.deleteBarText}>Delete {selectedIds.length} Selected</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  menuContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: theme.spacing.lg,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  topActions: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 20,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  listContent: {
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeChatItem: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  chatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 16,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  activeChatText: {
    color: theme.colors.primary,
  },
  chatMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  deleteSelectionBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.error,
    padding: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    ...theme.shadows.soft,
  },
  deleteBarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginLeft: 10,
    fontSize: 16,
  },
});
