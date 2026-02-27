import { initLlama, LlamaContext } from 'llama.rn';
import RNFS from 'react-native-fs';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

class LlamaService {
  private context: LlamaContext | null = null;
  private modelPath: string | null = null;

  async loadModel(path: string, n_ctx: number = 2048): Promise<void> {
    if (this.context) {
      await this.context.release();
    }

    const exists = await RNFS.exists(path);
    if (!exists) {
      throw new Error(`Model file not found at: ${path}`);
    }

    this.context = await initLlama({
      model: path,
      use_mlock: true,
      n_ctx: n_ctx,
      n_gpu_layers: 50, // Try to offload to GPU if possible
    });
    this.modelPath = path;
  }

  async generateCompletion(
    messages: Message[],
    onToken: (token: string) => void
  ): Promise<string> {
    if (!this.context) {
      throw new Error('Model not loaded');
    }

    // Simple prompt template for Llama 3 / Instruct models
    const prompt = messages
      .map(m => `<|start_header_id|>${m.role}<|end_header_id|>\n\n${m.content}<|eot_id|>`)
      .join('') + `<|start_header_id|>assistant<|end_header_id|>\n\n`;

    let fullResponse = '';
    
    await this.context.completion(
      {
        prompt,
        n_predict: 1024,
        stop: ['<|eot_id|>', '<|start_header_id|>', 'assistant:', 'user:'],
      },
      (data) => {
        const token = data.token;
        fullResponse += token;
        onToken(token);
      }
    );

    return fullResponse;
  }

  async stopGeneration(): Promise<void> {
    if (this.context) {
      // llama.rn has a stop method or we can just ignore future tokens
      // For now, let's assume we handle it via state in the hook
    }
  }

  async release(): Promise<void> {
    if (this.context) {
      await this.context.release();
      this.context = null;
      this.modelPath = null;
    }
  }

  isLoaded(): boolean {
    return !!this.context;
  }
}

export const llamaService = new LlamaService();
