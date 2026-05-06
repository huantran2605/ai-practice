/**
 * In-memory Vector Store for semantic search
 */
class VectorStore {
  constructor() {
    this.items = []; // Array of { text, vector }
    this.isIndexed = false;
  }

  /**
   * Add vectors and their corresponding text chunks to the store
   */
  add(chunks, vectors) {
    if (chunks.length !== vectors.length) {
      throw new Error('Chunks and vectors must have the same length');
    }

    for (let i = 0; i < chunks.length; i++) {
      this.items.push({
        text: chunks[i].text,
        vector: vectors[i]
      });
    }
    this.isIndexed = true;
  }

  /**
   * Perform semantic search using cosine similarity
   */
  search(queryVector, topK = 5) {
    if (this.items.length === 0) return [];

    const results = this.items.map(item => {
      const similarity = this._cosineSimilarity(queryVector, item.vector);
      return {
        text: item.text,
        score: similarity
      };
    });

    // Sort by similarity descending
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Clear the store
   */
  clear() {
    this.items = [];
    this.isIndexed = false;
  }

  /**
   * Export store data for persistence
   */
  exportData() {
    return {
      items: this.items,
      isIndexed: this.isIndexed
    };
  }

  /**
   * Import store data from persistence
   */
  importData(data) {
    if (!data) return;
    this.items = data.items || [];
    this.isIndexed = !!data.isIndexed;
  }

  /**
   * Calculate cosine similarity between two vectors
   * Since our vectors are normalized by the embedding model, 
   * this is just the dot product.
   */
  _cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct;
  }
}

export default VectorStore;
