/**
 * Coherence Validator
 * Ensures extracted entities actually relate to the transcript
 */

import type { Entity } from "./types";

interface ValidationResult {
  valid: boolean;
  coherenceScore: number;
  mentionedCount: number;
  totalCount: number;
  refinedEntities: Entity[];
  removed: string[];
  kept: string[];
}

// Semantic equivalents for common patterns
const SEMANTIC_MATCHES: Record<string, string[]> = {
  "anger": ["angry", "mad", "pissed", "frustrated", "annoying", "annoyed"],
  "frustration": ["frustrated", "frustrating", "annoying", "annoyed", "grinds"],
  "fear": ["scared", "afraid", "worried", "anxious", "nervous"],
  "anxiety": ["anxious", "worried", "nervous", "stress", "stressed"],
  "joy": ["happy", "glad", "excited", "thrilled"],
  "sadness": ["sad", "upset", "down", "depressed"],
  "control": ["controlling", "control", "manage", "handle"],
  "traffic": ["driving", "road", "cars", "commute"],
  "drivers": ["driving", "driver", "people", "cars"],
};

// Smart entity deduplication patterns
const SIMILARITY_PATTERNS: [RegExp, string][] = [
  [/stupid\s*drivers?|bad\s*drivers?|other\s*drivers?/i, "drivers"],
  [/traffic|road|commute|driving/i, "traffic"],
  [/angry|anger|mad|pissed|frustrated/i, "anger"],
  [/scared|fear|afraid|worried/i, "fear"],
  [/anxious|anxiety|nervous|stress/i, "anxiety"],
];

// Entity type priority for sorting
const TYPE_PRIORITY: Record<string, number> = {
  problem: 5,
  friction: 4,
  emotion: 3,
  value: 2,
  grease: 2,
  action: 1,
};

/**
 * Check if entities are coherent with the transcript
 */
export function validateCoherence(
  entities: Entity[],
  transcript: string
): ValidationResult {
  const transcriptLower = transcript.toLowerCase();
  const words = new Set(transcriptLower.split(/\s+/));
  
  const mentioned: Entity[] = [];
  const notMentioned: Entity[] = [];
  const kept: string[] = [];
  const removed: string[] = [];
  
  // Performance Optimization: Replaced .forEach() and nested .some() with standard for loops
  // and early breaks. We also directly construct the kept/removed label arrays to avoid .map() calls.
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const labelWords = entity.label.toLowerCase().split(/\s+/);
    
    let hasMatch = false;
    // Check if any word from label appears in transcript
    for (let j = 0; j < labelWords.length; j++) {
      const word = labelWords[j];

      // Direct match
      if (words.has(word)) {
        hasMatch = true;
        break;
      }
      
      // Fuzzy match (word appears as substring)
      if (word.length > 3 && transcriptLower.includes(word)) {
        hasMatch = true;
        break;
      }
      
      const matches = SEMANTIC_MATCHES[word];
      if (matches) {
        let semanticMatch = false;
        for (let k = 0; k < matches.length; k++) {
          if (transcriptLower.includes(matches[k])) {
            semanticMatch = true;
            break;
          }
        }
        if (semanticMatch) {
          hasMatch = true;
          break;
        }
      }
    }
    
    if (hasMatch) {
      mentioned.push(entity);
      kept.push(entity.label);
    } else {
      notMentioned.push(entity);
      removed.push(entity.label);
    }
  }
  
  const coherenceScore = entities.length > 0 
    ? mentioned.length / entities.length 
    : 1;
  
  // If coherence is too low, only keep mentioned entities
  // Allow some inferred entities (emotions) if coherence is decent
  const refinedEntities = coherenceScore >= 0.5 
    ? entities // Keep all if mostly coherent
    : mentioned.length >= 2 
      ? mentioned // Keep only mentioned if low coherence
      : entities.slice(0, 3); // Fallback: keep top 3
  
  return {
    valid: coherenceScore >= 0.6,
    coherenceScore,
    mentionedCount: mentioned.length,
    totalCount: entities.length,
    refinedEntities,
    removed,
    kept,
  };
}

/**
 * Smart entity deduplication
 * Combines similar concepts
 */
export function deduplicateEntities(entities: Entity[]): Entity[] {
  const seen = new Map<string, Entity>();
  
  return entities.filter(entity => {
    const normalized = entity.label.toLowerCase().trim();
    
    // Check if we've seen a similar entity
    for (const [pattern, canonical] of SIMILARITY_PATTERNS) {
      if (pattern.test(normalized)) {
        if (seen.has(canonical)) {
          return false; // Skip duplicate
        }
        seen.set(canonical, entity);
        return true;
      }
    }
    
    // Check exact duplicates
    if (seen.has(normalized)) {
      return false;
    }
    seen.set(normalized, entity);
    return true;
  });
}

/**
 * Prioritize entities by importance
 */
export function prioritizeEntities(
  entities: Entity[],
  maxCount: number
): Entity[] {
  return [...entities]
    .sort((a, b) => {
      // Sort by importance (higher first)
      const importanceA = a.metadata?.importance || 0.5;
      const importanceB = b.metadata?.importance || 0.5;
      
      if (importanceB !== importanceA) {
        return importanceB - importanceA;
      }
      
      return (TYPE_PRIORITY[b.type] || 0) - (TYPE_PRIORITY[a.type] || 0);
    })
    .slice(0, maxCount);
}
