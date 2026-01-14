import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ExtractedUniversityInfo {
  name: string;
  location: string;
  type: 'public' | 'private';
  fields: string[];
  fees: {
    undergraduate: number;
    graduate: number;
    currency: string;
  };
  admission_requirements: {
    min_percentage: number;
    requirements: string[];
  };
  ranking: number | null;
  established: number | null;
  website: string;
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  description: string;
  features: string[];
  closing_percentage: number;
}

export interface CrawledUniversity {
  id: string;
  university_id: string;
  university_name: string;
  table_name: string;
  last_crawl: string;
  status: string;
  pages_count: number;
  website_url?: string;
  logo_url?: string;
  brand_colors?: Record<string, string>;
  extracted_info?: ExtractedUniversityInfo;
  info_extracted_at?: string;
}

export const useCrawledUniversities = () => {
  const [universities, setUniversities] = useState<CrawledUniversity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const { data, error } = await supabase
          .from('university_crawls')
          .select('*')
          .eq('status', 'completed')
          .order('university_name', { ascending: true });

        if (error) {
          console.error('Error fetching universities:', error);
          setError(error.message);
        } else {
          setUniversities(data || []);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to fetch universities');
      } finally {
        setLoading(false);
      }
    };

    fetchUniversities();
  }, []);

  const refetch = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('university_crawls')
        .select('*')
        .eq('status', 'completed')
        .order('university_name', { ascending: true });

      if (error) {
        console.error('Error fetching universities:', error);
        setError(error.message);
      } else {
        setUniversities(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to fetch universities');
    } finally {
      setLoading(false);
    }
  };

  return { universities, loading, error, refetch };
};
