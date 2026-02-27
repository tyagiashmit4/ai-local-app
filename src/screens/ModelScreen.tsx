import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text, Alert } from 'react-native';
import { ModelCard } from '../components/ModelCard';
import { RECOMMENDED_MODELS, downloadModel, ModelInfo } from '../api/huggingface';
import { listModels, getModelPath, deleteModel } from '../utils/fileSystem';
import { useLlama } from '../hooks/useLlama';
import { SafeAreaView } from 'react-native-safe-area-context';

export const ModelScreen = () => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedFiles, setDownloadedFiles] = useState<string[]>([]);
  const { loadModel, isGenerating, currentModelName } = useLlama();

  useEffect(() => {
    refreshDownloadedModels();
  }, []);

  const refreshDownloadedModels = async () => {
    const files = await listModels();
    setDownloadedFiles(files.map(f => f.name));
  };

  const handeDownload = async (model: ModelInfo) => {
    if (downloadingId) return;
    
    setDownloadingId(model.id);
    setDownloadProgress(0);
    
    try {
      await downloadModel(model, (progress) => {
        setDownloadProgress(progress);
      });
      Alert.alert('Success', 'Model downloaded successfully!');
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
      Alert.alert('Loading', 'Loading model into RAM. This may take a few seconds...');
      await loadModel(path);
      Alert.alert('Loaded', `${model.name} is ready!`);
    } catch (err: any) {
      Alert.alert('Load Error', err.message);
    }
  };

  const handleDelete = async (model: ModelInfo) => {
    Alert.alert(
      'Delete Model',
      `Are you sure you want to delete ${model.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await deleteModel(model.filename);
            refreshDownloadedModels();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Model Management</Text>
        <Text style={styles.headerSubtitle}>Models are stored locally on your device.</Text>
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
            onDownload={() => handeDownload(item)}
            onSelect={() => handleSelect(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E9EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  listContent: {
    padding: 20,
  },
});
