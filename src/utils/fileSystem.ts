import RNFS from 'react-native-fs';

export const MODELS_DIR = `${RNFS.DocumentDirectoryPath}/models`;

export const ensureModelsDir = async () => {
  const exists = await RNFS.exists(MODELS_DIR);
  if (!exists) {
    await RNFS.mkdir(MODELS_DIR);
  }
};

export const getModelPath = (filename: string) => {
  return `${MODELS_DIR}/${filename}`;
};

export const listModels = async () => {
  await ensureModelsDir();
  const files = await RNFS.readDir(MODELS_DIR);
  return files.filter(f => f.name.endsWith('.gguf'));
};

export const deleteModel = async (filename: string) => {
  const path = getModelPath(filename);
  if (await RNFS.exists(path)) {
    await RNFS.unlink(path);
  }
};
