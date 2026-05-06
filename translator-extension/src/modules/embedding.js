import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js to use local WASM files
// CRXJS will bundle these into the assets/ directory
env.allowLocalModels = false;
env.allowRemoteModels = true;

// Singleton to manage the embedding pipeline
class EmbeddingService {
  static task = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance = null;
  static loadingPromise = null;

  /**
   * Get or initialize the embedding pipeline instance
   */
  static async getInstance() {
    if (this.instance) return this.instance;
    if (this.loadingPromise) return this.loadingPromise;

    console.log('[EmbeddingService] Initializing model...');
    this.loadingPromise = pipeline(this.task, this.model, {
      progress_callback: (progress) => {
        if (progress.status === 'done') {
          console.log(`[EmbeddingService] Loaded ${progress.file}`);
        }
      }
    });

    try {
      this.instance = await this.loadingPromise;
      console.log('[EmbeddingService] Model ready.');
      return this.instance;
    } catch (error) {
      this.loadingPromise = null;
      console.error('[EmbeddingService] Failed to load model:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for a single text string
   */
  static async embed(text) {
    const extractor = await this.getInstance();
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true,
    });
    
    // Convert Tensor to standard JS array
    return Array.from(output.data);
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  static async embedBatch(texts, onProgress) {
    const results = [];
    const total = texts.length;
    
    for (let i = 0; i < total; i++) {
      const vector = await this.embed(texts[i]);
      results.push(vector);
      if (onProgress) onProgress(i + 1, total);
    }
    
    return results;
  }
}

export default EmbeddingService;
