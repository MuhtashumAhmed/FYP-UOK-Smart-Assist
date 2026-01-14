export interface University {
  id: string;
  name: string;
  location: string;
  logo: string;
  fields: string[];
  minPercentage: number;
  maxFee: number;
  ranking?: number;
  type: 'public' | 'private';
  features: string[];
}

export interface SearchCriteria {
  percentage: number;
  budget: number;
  field: string;
}

export type ChanceLevel = 'high' | 'moderate' | 'low';

export interface UniversityMatch extends University {
  chance: ChanceLevel;
  matchReasons: string[];
}
