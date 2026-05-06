/**
 * Simple Recursive Character Text Splitter
 */
class TextChunker {
  /**
   * Splits text into chunks with specified size and overlap
   */
  static chunk(text, options = {}) {
    const {
      chunkSize = 500,
      chunkOverlap = 50,
      separators = ['\n\n', '\n', '. ', '! ', '? ', ' ', '']
    } = options;

    if (!text) return [];

    const chunks = this._splitText(text, separators, chunkSize, chunkOverlap);
    return chunks.map((t, i) => ({ text: t, index: i }));
  }

  static _splitText(text, separators, chunkSize, chunkOverlap) {
    const finalChunks = [];
    
    // Initial split by the first separator
    let separator = separators[0];
    let nextSeparators = separators.slice(1);
    
    const parts = text.split(separator);
    let currentChunk = "";

    for (let i = 0; i < parts.length; i++) {
      let part = parts[i];
      
      if ((currentChunk + part).length > chunkSize && currentChunk.length > 0) {
        if (part.length > chunkSize && nextSeparators.length > 0) {
          finalChunks.push(currentChunk.trim());
          // FIX: Ensure subChunks are strings, not objects
          const subChunks = this._splitText(part, nextSeparators, chunkSize, chunkOverlap);
          finalChunks.push(...subChunks);
          currentChunk = "";
        } else {
          finalChunks.push(currentChunk.trim());
          const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
          currentChunk = currentChunk.substring(overlapStart) + separator + part;
        }
      } else {
        currentChunk += (currentChunk.length > 0 ? separator : "") + part;
      }
    }

    if (currentChunk.trim().length > 0) {
      finalChunks.push(currentChunk.trim());
    }

    // Filter out empty and only return strings
    return finalChunks.filter(c => typeof c === 'string' && c.length > 0);
  }
}

export default TextChunker;
