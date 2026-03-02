import RNFS from 'react-native-fs';

export const MODELS_DIR = `${RNFS.DocumentDirectoryPath}/models`;
export const SETTINGS_FILE = `${RNFS.DocumentDirectoryPath}/settings.json`;
export const CHATS_DIR = `${RNFS.DocumentDirectoryPath}/chats`;

export const ensureChatsDir = async () => {
  const exists = await RNFS.exists(CHATS_DIR);
  if (!exists) {
    await RNFS.mkdir(CHATS_DIR);
  }
};

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

export const saveChat = async (id: string, messages: any[]) => {
  await ensureChatsDir();
  const path = `${CHATS_DIR}/${id}.json`;
  await RNFS.writeFile(path, JSON.stringify(messages), 'utf8');
};

export const listChats = async () => {
  await ensureChatsDir();
  const exists = await RNFS.exists(CHATS_DIR);
  if (!exists) return [];
  const files = await RNFS.readDir(CHATS_DIR);
  return files.filter(f => f.name.endsWith('.json'));
};

export const loadChat = async (id: string) => {
  const path = `${CHATS_DIR}/${id}.json`;
  if (await RNFS.exists(path)) {
    const content = await RNFS.readFile(path, 'utf8');
    return JSON.parse(content);
  }
  return [];
};

export const deleteChat = async (id: string) => {
  const path = `${CHATS_DIR}/${id}.json`;
  if (await RNFS.exists(path)) {
    await RNFS.unlink(path);
  }
};

export const saveSettings = async (settings: any) => {
  await RNFS.writeFile(SETTINGS_FILE, JSON.stringify(settings), 'utf8');
};

export const loadSettings = async () => {
  if (await RNFS.exists(SETTINGS_FILE)) {
    const content = await RNFS.readFile(SETTINGS_FILE, 'utf8');
    return JSON.parse(content);
  }
  return null;
};
