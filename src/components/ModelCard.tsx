import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ModelInfo } from '../api/huggingface';
import { Download, CheckCircle, Play, Trash2, Cpu } from 'lucide-react-native';
import { theme } from '../styles/theme';

interface ModelCardProps {
  model: ModelInfo;
  isDownloaded: boolean;
  isLoading: boolean;
  isCurrent: boolean;
  progress: number;
  onDownload: () => void;
  onSelect: () => void;
  onDelete: () => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  isDownloaded,
  isLoading,
  isCurrent,
  progress,
  onDownload,
  onSelect,
  onDelete,
}) => {
  return (
    <View style={[
      styles.container, 
      isCurrent && styles.currentContainer,
      theme.shadows.soft
    ]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Cpu color={isCurrent ? theme.colors.success : theme.colors.primary} size={24} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{model.name}</Text>
          <Text style={styles.size}>{model.size}</Text>
        </View>
        {isDownloaded && !isLoading && (
           <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Trash2 color={theme.colors.error} size={18} />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.description}>{model.description}</Text>

      {isLoading ? (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Downloading Brain...</Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBar}>
             <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          {!isDownloaded ? (
            <TouchableOpacity style={styles.downloadButton} onPress={onDownload}>
              <Download color="#FFFFFF" size={18} />
              <Text style={styles.buttonText}>Download</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[
                styles.selectButton, 
                isCurrent ? styles.selectedButton : styles.idleButton
              ]} 
              onPress={onSelect}
              disabled={isCurrent}
            >
              {isCurrent ? (
                <CheckCircle color={theme.colors.success} size={18} />
              ) : (
                <Play color="#FFFFFF" size={18} />
              )}
              <Text style={[
                styles.buttonText, 
                isCurrent && { color: theme.colors.success }
              ]}>
                {isCurrent ? 'Active Engine' : 'Load Model'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  currentContainer: {
    borderColor: theme.colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  size: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
  },
  downloadButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectButton: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  idleButton: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  selectedButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.success,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 8,
  },
  deleteButton: {
    padding: 8,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '800',
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
});
