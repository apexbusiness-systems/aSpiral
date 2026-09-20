/**
 * Anti-repetition engine for question diversity
 * Tracks patterns and prevents repetitive question structures
 */

export class AntiRepetitionEngine {
  private questionHistory: string[] = [];
  private patternHistory: string[] = [];
  private startWordCounts: Map<string, number> = new Map();

  /**
   * Check if a question is too similar to recent ones
   */
  isTooSimilar(newQuestion: string): boolean {
    const recent = this.questionHistory.slice(-5);
    if (recent.length === 0) return false;

    // Extract first word
    // Extract first word manually instead of full split
    let firstSpace = newQuestion.indexOf(' ');
    if (firstSpace === -1) firstSpace = newQuestion.length;
    const newStart = newQuestion.substring(0, firstSpace).toLowerCase();

    // Check if we've used this start word too often
    const startCount = this.startWordCounts.get(newStart) || 0;
    if (startCount >= 2) return true;

    // Check structural similarity
    const newStructure = this.extractStructure(newQuestion);

    // Check if starts with same 3 words
    // ⚡ Bolt: Hoisted constant calculation out of loop and replaced chained array methods
    // with a single-pass extraction loop for the first 3 words to avoid O(N) allocations.
    const newWords = this.extractFirstNWords(newQuestion.toLowerCase(), 3);

    for (let i = 0; i < recent.length; i++) {
      const oldQ = recent[i];
      const oldStructure = this.extractStructure(oldQ);
      if (newStructure === oldStructure) return true;

      const oldWords = this.extractFirstNWords(oldQ.toLowerCase(), 3);
      if (newWords === oldWords) return true;
    }

    return false;
  }

/**
   * Extract question structure pattern
   */
  private extractFirstNWords(str: string, n: number): string {
    let wordCount = 0;
    let endIdx = -1;
    for (let i = 0; i < str.length; i++) {
      if (str.charCodeAt(i) === 32) { // space
        wordCount++;
        if (wordCount === n) {
          endIdx = i;
          break;
        }
      }
    }
    return endIdx === -1 ? str : str.substring(0, endIdx);
  }

  /**
   * Extract question structure pattern
   */
  private extractStructure(question: string): string {
    let result = "";
    let wordCount = 0;
    const qLower = question.toLowerCase();

    // Quick pre-replace
    const replaced = qLower
      .replace(/\b(you|your|that|this|it|the|a|an)\b/g, "X")
      .replace(/[^a-z\s]/g, "");

    let inWord = false;
    let wordStart = 0;

    for (let i = 0, len = replaced.length; i <= len; i++) {
      const isEnd = i === len;
      const isSpace = !isEnd && replaced.charCodeAt(i) === 32;

      if (isSpace || isEnd) {
        if (inWord) {
          const wordLen = i - wordStart;
          if (wordLen > 2) {
            if (wordCount > 0) result += "-";
            result += replaced.substring(wordStart, i);
            wordCount++;
            if (wordCount === 5) break;
          }
          inWord = false;
        }
      } else {
        if (!inWord) {
          inWord = true;
          wordStart = i;
        }
      }
    }

    return result;
  }

  /**
   * Record a question for tracking
   */
  record(question: string, pattern: string): void {
    this.questionHistory.push(question);
    this.patternHistory.push(pattern);

    // Track start word
    // Extract first word manually instead of full split
    let firstSpace = question.indexOf(' ');
    if (firstSpace === -1) firstSpace = question.length;
    const startWord = question.substring(0, firstSpace).toLowerCase();
    this.startWordCounts.set(
      startWord,
      (this.startWordCounts.get(startWord) || 0) + 1
    );

    // Keep last 10
    if (this.questionHistory.length > 10) {
      const removed = this.questionHistory.shift();
      this.patternHistory.shift();

      // Decrement start word count
      if (removed) {
        let removedFirstSpace = removed.indexOf(' ');
        if (removedFirstSpace === -1) removedFirstSpace = removed.length;
        const removedStart = removed.substring(0, removedFirstSpace).toLowerCase();
        const count = this.startWordCounts.get(removedStart) || 0;
        if (count > 1) {
          this.startWordCounts.set(removedStart, count - 1);
        } else {
          this.startWordCounts.delete(removedStart);
        }
      }
    }
  }

  /**
   * Get diversity score (0-1)
   */
  getDiversityScore(): number {
    if (this.patternHistory.length === 0) return 1;
    const uniquePatterns = new Set(this.patternHistory).size;
    return uniquePatterns / this.patternHistory.length;
  }

  /**
   * Get used pattern categories
   */
  getUsedPatterns(): Set<string> {
    return new Set(this.patternHistory);
  }

  /**
   * Reset tracking
   */
  reset(): void {
    this.questionHistory = [];
    this.patternHistory = [];
    this.startWordCounts.clear();
  }
}

// Singleton instance
export const antiRepetition = new AntiRepetitionEngine();
