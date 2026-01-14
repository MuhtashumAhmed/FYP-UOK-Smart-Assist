import { University, SearchCriteria, UniversityMatch, ChanceLevel } from '@/types/university';
import { universities } from '@/data/universities';

export function calculateChance(percentage: number, minPercentage: number): ChanceLevel {
  const diff = percentage - minPercentage;
  if (diff >= 10) return 'high';
  if (diff >= 0) return 'moderate';
  return 'low';
}

export function matchUniversities(criteria: SearchCriteria): UniversityMatch[] {
  const matches: UniversityMatch[] = [];

  for (const university of universities) {
    // Check if field matches
    const fieldMatch = university.fields.some(
      f => f.toLowerCase() === criteria.field.toLowerCase()
    );
    
    if (!fieldMatch) continue;

    // Check budget
    const budgetMatch = university.maxFee <= criteria.budget;
    
    // Calculate chance
    const chance = calculateChance(criteria.percentage, university.minPercentage);
    
    // Build match reasons
    const matchReasons: string[] = [];
    
    if (criteria.percentage >= university.minPercentage) {
      matchReasons.push('Matches your percentage');
    } else {
      matchReasons.push('Slightly below requirement');
    }
    
    if (budgetMatch) {
      matchReasons.push('Fits your budget');
    } else {
      matchReasons.push('Above budget range');
    }
    
    matchReasons.push('Program available in your field');

    matches.push({
      ...university,
      chance,
      matchReasons
    });
  }

  // Sort by chance (high first) then by ranking
  return matches.sort((a, b) => {
    const chanceOrder = { high: 0, moderate: 1, low: 2 };
    if (chanceOrder[a.chance] !== chanceOrder[b.chance]) {
      return chanceOrder[a.chance] - chanceOrder[b.chance];
    }
    return (a.ranking || 100) - (b.ranking || 100);
  });
}
