import RNFS from 'react-native-fs';
import { getModelPath, ensureModelsDir } from '../utils/fileSystem';

export interface ModelInfo {
  id: string;
  name: string;
  repo: string;
  filename: string;
  size: string;
  expectedSizeBytes: number;
  description: string;
  isDefault?: boolean;
}

export const RECOMMENDED_MODELS: ModelInfo[] = [
  {
    id: 'llama-3.2-1b',
    name: 'Llama 3.2 1B (Quest)',
    repo: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    size: '700MB',
    expectedSizeBytes: 810000000, // Approx 810MB
    description: 'Fastest for mobile, good for basic tasks.',
    isDefault: true,
  },
  {
    id: 'qwen-2.5-1.5b',
    name: 'Qwen 2.5 1.5B',
    repo: 'Qwen/Qwen2.5-1.5B-Instruct-GGUF',
    filename: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    size: '1.1GB',
    expectedSizeBytes: 1120000000, // Approx 1.12GB
    description: 'Excellent multilingual capabilities and efficiency.',
  },
  {
    id: 'gemma-2-2b',
    name: 'Gemma 2 2B',
    repo: 'bartowski/gemma-2-2b-it-GGUF',
    filename: 'gemma-2-2b-it-Q4_K_M.gguf',
    size: '1.6GB',
    expectedSizeBytes: 1640000000, // Approx 1.64GB
    description: 'Highly capable 2B model by Google.',
  },
  {
    id: 'phi-3.5-mini',
    name: 'Phi-3.5 Mini',
    repo: 'bartowski/Phi-3.5-mini-instruct-GGUF',
    filename: 'Phi-3.5-mini-instruct-Q4_K_M.gguf',
    size: '2.2GB',
    expectedSizeBytes: 2390000000, // Approx 2.39GB
    description: 'Strong reasoning, requires more RAM.',
  },
  {
    id: 'whisper-tiny-en',
    name: 'Whisper Tiny (English)',
    repo: 'ggerganov/whisper.cpp',
    filename: 'ggml-tiny.en.bin',
    size: '75MB',
    expectedSizeBytes: 77000000,
    description: 'Lightweight speech-to-text model.',
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
  
  try {
    return await result.promise;
  } catch (err) {
    // Cleanup partial file if download fails
    if (await RNFS.exists(path)) {
      await RNFS.unlink(path);
    }
    throw err;
  }
};
