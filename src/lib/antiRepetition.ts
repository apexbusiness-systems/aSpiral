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
    const newStart = newQuestion.split(" ")[0].toLowerCase();

    // Check if we've used this start word too often
    const startCount = this.startWordCounts.get(newStart) || 0;
    if (startCount >= 2) return true;

    // Check structural similarity
    const newStructure = this.extractStructure(newQuestion);
    for (const oldQ of recent) {
      const oldStructure = this.extractStructure(oldQ);
      if (newStructure === oldStructure) return true;

      // Check if starts with same 3 words
      const newWords = newQuestion.toLowerCase().split(" ").slice(0, 3).join(" ");
      const oldWords = oldQ.toLowerCase().split(" ").slice(0, 3).join(" ");
      if (newWords === oldWords) return true;
    }

    return false;
  }

  /**
   * Extract question structure pattern
   */
  private extractStructure(question: string): string {
    return question
      .toLowerCase()
      .replace(/\b(you|your|that|this|it|the|a|an)\b/g, "X")
      .replace(/[^a-z\s]/g, "")
      .split(" ")
      .filter((w) => w.length > 2)
      .slice(0, 5)
      .join("-");
  }

  /**
   * Record a question for tracking
   */
  record(question: string, pattern: string): void {
    this.questionHistory.push(question);
    this.patternHistory.push(pattern);

    // Track start word
    const startWord = question.split(" ")[0].toLowerCase();
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
        const removedStart = removed.split(" ")[0].toLowerCase();
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
