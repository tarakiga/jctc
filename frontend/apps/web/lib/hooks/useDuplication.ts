'use client';

import { useQuery } from '@tanstack/react-query';

export interface DuplicateMatch {
  case_id: string;
  case_number: string;
  title: string;
  description: string;
  date_reported: string;
  status: string;
  similarity_score: number; // 0-100
  matching_fields: string[]; // e.g., ['title', 'reporter_contact']
}

export interface DuplicationCheckResult {
  has_potential_duplicates: boolean;
  matches: DuplicateMatch[];
  threshold_used: number;
}

/**
 * Calculate Levenshtein distance between two strings
 * (number of single-character edits needed to change one word into the other)
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[s2.length][s1.length];
};

/**
 * Calculate similarity score between two strings (0-100)
 */
const calculateStringSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 100;
  
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100;
  
  const distance = levenshteinDistance(str1, str2);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  
  return Math.round(similarity);
};

/**
 * Extract key terms from text (simple tokenization)
 */
const extractKeyTerms = (text: string): string[] => {
  if (!text) return [];
  
  // Remove common words and split
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word));
};

/**
 * Calculate term overlap similarity
 */
const calculateTermOverlap = (text1: string, text2: string): number => {
  const terms1 = new Set(extractKeyTerms(text1));
  const terms2 = new Set(extractKeyTerms(text2));
  
  if (terms1.size === 0 || terms2.size === 0) return 0;
  
  const intersection = new Set([...terms1].filter(x => terms2.has(x)));
  const union = new Set([...terms1, ...terms2]);
  
  return Math.round((intersection.size / union.size) * 100);
};

/**
 * Check for duplicate cases based on title, description, and reporter details
 */
export const checkForDuplicates = async (
  title: string,
  description?: string,
  reporterContact?: string,
  existingCases?: any[]
): Promise<DuplicationCheckResult> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (!existingCases || existingCases.length === 0) {
    return {
      has_potential_duplicates: false,
      matches: [],
      threshold_used: 70,
    };
  }
  
  const matches: DuplicateMatch[] = [];
  const similarityThreshold = 70; // 70% similarity to flag as potential duplicate
  
  for (const existingCase of existingCases) {
    const matchingFields: string[] = [];
    let totalScore = 0;
    let fieldCount = 0;
    
    // Compare title (weight: 50%)
    if (title && existingCase.title) {
      const titleSimilarity = Math.max(
        calculateStringSimilarity(title, existingCase.title),
        calculateTermOverlap(title, existingCase.title)
      );
      
      if (titleSimilarity >= similarityThreshold) {
        matchingFields.push('title');
        totalScore += titleSimilarity * 0.5;
        fieldCount += 0.5;
      }
    }
    
    // Compare description (weight: 30%)
    if (description && existingCase.description) {
      const descriptionSimilarity = Math.max(
        calculateStringSimilarity(description, existingCase.description),
        calculateTermOverlap(description, existingCase.description)
      );
      
      if (descriptionSimilarity >= similarityThreshold - 10) {
        matchingFields.push('description');
        totalScore += descriptionSimilarity * 0.3;
        fieldCount += 0.3;
      }
    }
    
    // Compare reporter contact (weight: 20%)
    if (reporterContact && existingCase.reporter_contact) {
      const contactSimilarity = calculateStringSimilarity(reporterContact, existingCase.reporter_contact);
      
      if (contactSimilarity >= 90) { // High threshold for contact match
        matchingFields.push('reporter_contact');
        totalScore += contactSimilarity * 0.2;
        fieldCount += 0.2;
      }
    }
    
    // Calculate weighted average similarity
    const similarityScore = fieldCount > 0 ? Math.round(totalScore / fieldCount) : 0;
    
    // Only include cases above threshold with at least one matching field
    if (similarityScore >= similarityThreshold && matchingFields.length > 0) {
      matches.push({
        case_id: existingCase.id,
        case_number: existingCase.case_number,
        title: existingCase.title,
        description: existingCase.description || '',
        date_reported: existingCase.date_reported,
        status: existingCase.status,
        similarity_score: similarityScore,
        matching_fields: matchingFields,
      });
    }
  }
  
  // Sort by similarity score (highest first)
  matches.sort((a, b) => b.similarity_score - a.similarity_score);
  
  return {
    has_potential_duplicates: matches.length > 0,
    matches: matches.slice(0, 5), // Limit to top 5 matches
    threshold_used: similarityThreshold,
  };
};

/**
 * Hook to check for duplicates
 */
export const useDuplicateCheck = (
  title: string,
  description?: string,
  reporterContact?: string,
  existingCases?: any[],
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['duplicateCheck', title, description, reporterContact],
    queryFn: () => checkForDuplicates(title, description, reporterContact, existingCases),
    enabled: enabled && (title?.length > 3 || false), // Only run if title has at least 4 characters
    staleTime: 30000, // Cache for 30 seconds
  });
};

/**
 * Get color class for similarity score
 */
export const getSimilarityColorClass = (score: number): {
  bg: string;
  text: string;
  border: string;
} => {
  if (score >= 90) {
    return {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-300',
    };
  }
  if (score >= 80) {
    return {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-300',
    };
  }
  return {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
  };
};

/**
 * Format matching fields for display
 */
export const formatMatchingFields = (fields: string[]): string => {
  const fieldLabels: Record<string, string> = {
    title: 'Title',
    description: 'Description',
    reporter_contact: 'Reporter Contact',
  };
  
  return fields.map(f => fieldLabels[f] || f).join(', ');
};
