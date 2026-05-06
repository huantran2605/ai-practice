import EmbeddingService from './embedding.js';
import TextChunker from './chunker.js';
import VectorStore from './vectorStore.js';

/**
 * RAG Pipeline Orchestrator
 */
class RAGPipeline {
  constructor() {
    this.vectorStore = new VectorStore();
    this.status = 'idle'; // 'idle' | 'loading_model' | 'indexing' | 'ready' | 'error'
    this.progress = { current: 0, total: 0 };
    this.lastError = null;
  }

  /**
   * Fully index a page content
   */
  async indexPage(pageText, onStatusUpdate, options = {}) {
    try {
      this.reset();
      
      this.status = 'loading_model';
      if (onStatusUpdate) onStatusUpdate(this.getStatus());
      
      // Ensure model is loaded
      await EmbeddingService.getInstance();
      
      this.status = 'indexing';
      const chunks = TextChunker.chunk(pageText);
      this.progress = { current: 0, total: chunks.length };
      if (onStatusUpdate) onStatusUpdate(this.getStatus());

      const vectors = await EmbeddingService.embedBatch(
        chunks.map(c => c.text),
        (current, total) => {
          this.progress = { current, total };
          if (onStatusUpdate) onStatusUpdate(this.getStatus());
        }
      );

      this.vectorStore.add(chunks, vectors);
      this.status = 'ready';
      if (onStatusUpdate) onStatusUpdate(this.getStatus());
      
      // Save for persistence
      if (options.url) {
        await this.saveState(options.url);
      }
      
      return true;
    } catch (error) {
      this.status = 'error';
      this.lastError = error.message;
      if (onStatusUpdate) onStatusUpdate(this.getStatus());
      console.error('[RAGPipeline] Indexing failed:', error);
      throw error;
    }
  }

  /**
   * Save the current state to persistent storage
   */
  async saveState(url) {
    if (!this.vectorStore.isIndexed) return;
    const key = `rag_v2_${url}`;
    const data = {
      vectorStore: this.vectorStore.exportData(),
      timestamp: Date.now()
    };
    return new Promise(resolve => {
      chrome.storage.local.set({ [key]: data }, resolve);
    });
  }

  /**
   * Load state from persistent storage
   */
  async loadState(url) {
    const key = `rag_v2_${url}`;
    return new Promise(resolve => {
      chrome.storage.local.get(key, (result) => {
        const data = result[key];
        if (data && data.vectorStore) {
          this.vectorStore.importData(data.vectorStore);
          this.status = 'ready';
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  /**
   * Search for context relevant to a question
   */
  async getContext(question, topK = 5) {
    if (this.status !== 'ready') {
      throw new Error('Pipeline not ready. Please index a page first.');
    }

    const queryVector = await EmbeddingService.embed(question);
    const results = this.vectorStore.search(queryVector, topK);
    
    return results.map((r, i) => `[Đoạn ${i + 1}] ${r.text}`).join('\n\n');
  }

  getStatus() {
    return {
      status: this.status,
      progress: this.progress,
      lastError: this.lastError,
      isIndexed: this.vectorStore.isIndexed
    };
  }

  reset() {
    this.vectorStore.clear();
    this.status = 'idle';
    this.progress = { current: 0, total: 0 };
    this.lastError = null;
  }
}

export default RAGPipeline;
