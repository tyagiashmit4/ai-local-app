import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text, Alert, LayoutAnimation, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ModelCard } from '../components/ModelCard';
import { RECOMMENDED_MODELS, downloadModel, ModelInfo } from '../api/huggingface';
import { listModels, getModelPath, deleteModel } from '../utils/fileSystem';
import { useLlama } from '../hooks/useLlama';
import { useWhisper } from '../hooks/useWhisper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { ChevronLeft } from 'lucide-react-native';

export const ModelScreen = ({ navigation }: any) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedFiles, setDownloadedFiles] = useState<string[]>([]);
  const { loadModel, isGenerating, currentModelName, isLoadingModel } = useLlama();
  const { loadWhisperModel } = useWhisper();

  useEffect(() => {
    refreshDownloadedModels();
  }, []);

  const refreshDownloadedModels = async () => {
    const files = await listModels();
    setDownloadedFiles(files.map(f => f.name));
  };

  const handleDownload = async (model: ModelInfo) => {
    if (downloadingId) return;
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDownloadingId(model.id);
    setDownloadProgress(0);
    
    try {
      await downloadModel(model, (progress) => {
        setDownloadProgress(progress);
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      refreshDownloadedModels();
    } catch (err: any) {
      Alert.alert('Download Error', err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSelect = async (model: ModelInfo) => {
    if (isGenerating) {
      Alert.alert('Busy', 'Please wait for the current response to finish.');
      return;
    }

    const path = getModelPath(model.filename);
    try {
      if (model.filename.endsWith('.bin')) {
        await loadWhisperModel(path);
        Alert.alert('Success', 'Whisper model loaded successfully');
      } else {
        await loadModel(path);
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    } catch (err: any) {
      Alert.alert('Load Error', err.message);
    }
  };

  const handleDelete = async (model: ModelInfo) => {
    Alert.alert(
      'Delete Brain',
      `Are you sure you want to remove ${model.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await deleteModel(model.filename);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            refreshDownloadedModels();
          }
        }
      ]
    );
  };

  return (
     <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Neural Center</Text>
        </View>
        <Text style={styles.headerSubtitle}>Manage your local AI brains. Offline & Secure.</Text>
      </View>

      <FlatList
        data={RECOMMENDED_MODELS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ModelCard
            model={item}
            isDownloaded={downloadedFiles.includes(item.filename)}
            isLoading={downloadingId === item.id}
            isCurrent={currentModelName === item.filename}
            progress={downloadProgress}
            onDownload={() => handleDownload(item)}
            onSelect={() => handleSelect(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
      />

      {isLoadingModel && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Infusing Brain...</Text>
            <Text style={styles.loadingSubtext}>Loading model into RAM. Please wait.</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.soft,
    marginBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: '500',
    opacity: 0.8,
    paddingLeft: 40
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: -8, 
  },
  backButton: {
    padding: 8,
    marginRight: 4,
    borderRadius: 12,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
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
