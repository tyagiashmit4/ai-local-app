import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ModelInfo } from '../api/huggingface';
import { Download, CheckCircle, Play, Trash2 } from 'lucide-react-native';

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
    <View style={[styles.container, isCurrent && styles.currentContainer]}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.name}>{model.name}</Text>
          <Text style={styles.size}>{model.size}</Text>
        </View>
        {isDownloaded && !isLoading && (
           <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Trash2 color="#FF3B30" size={18} />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.description}>{model.description}</Text>

      {isLoading ? (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Downloading... {Math.round(progress)}%</Text>
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
              style={[styles.selectButton, isCurrent && styles.selectedButton]} 
              onPress={onSelect}
              disabled={isCurrent}
            >
              {isCurrent ? <CheckCircle color="#FFFFFF" size={18} /> : <Play color="#FFFFFF" size={18} />}
              <Text style={styles.buttonText}>{isCurrent ? 'Current Model' : 'Load Model'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9E9EB',
  },
  currentContainer: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  size: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: '#3C3C43',
    marginBottom: 16,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
  },
  downloadButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButton: {
    flexDirection: 'row',
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#8E8E93',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    padding: 4,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E9E9EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
});
