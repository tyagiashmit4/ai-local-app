import RNFS from 'react-native-fs';
import { getModelPath, ensureModelsDir } from '../utils/fileSystem';

export interface ModelInfo {
  id: string;
  name: string;
  repo: string;
  filename: string;
  size: string;
  description: string;
}

export const RECOMMENDED_MODELS: ModelInfo[] = [
  {
    id: 'llama-3.2-1b',
    name: 'Llama 3.2 1B (Quest)',
    repo: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    size: '700MB',
    description: 'Fastest for mobile, good for basic tasks.',
  },
  {
    id: 'phi-3.5-mini',
    name: 'Phi-3.5 Mini',
    repo: 'bartowski/Phi-3.5-mini-instruct-GGUF',
    filename: 'Phi-3.5-mini-instruct-Q4_K_M.gguf',
    size: '2.2GB',
    description: 'Strong reasoning, requires more RAM.',
  }
];

export const downloadModel = async (
  model: ModelInfo,
  onProgress: (progress: number) => void
) => {
  await ensureModelsDir();
  const path = getModelPath(model.filename);
  
  // Example URL structure for Hugging Face GGUF files
  const url = `https://huggingface.co/${model.repo}/resolve/main/${model.filename}?download=true`;

  const options: RNFS.DownloadFileOptions = {
    fromUrl: url,
    toFile: path,
    progress: (res) => {
      const progress = (res.bytesWritten / res.contentLength) * 100;
      onProgress(progress);
    },
    progressInterval: 500,
  };

  const result = RNFS.downloadFile(options);
  return result.promise;
};
