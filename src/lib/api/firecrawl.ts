import { supabase } from '@/lib/supabase';

type FirecrawlResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
  crawlId?: string;
  status?: string;
  completed?: number;
  total?: number;
  links?: string[];
};

type CrawlOptions = {
  limit?: number;
  maxDepth?: number;
  includePaths?: string[];
  excludePaths?: string[];
};

type MapOptions = {
  search?: string;
  limit?: number;
  includeSubdomains?: boolean;
};

export const firecrawlApi = {
  // Crawl a university website
  async crawl(
    url: string,
    universityId: string,
    universityName: string,
    options?: CrawlOptions
  ): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-crawl', {
      body: { url, universityId, universityName, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  // Map a website to discover URLs
  async map(url: string, options?: MapOptions): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-map', {
      body: { url, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  // Get crawl status from Firecrawl API (called via edge function)
  async getCrawlStatus(crawlId: string): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-status', {
      body: { crawlId },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  // Store crawl data in university-specific table
  async storeUniversityData(
    universityId: string,
    universityName: string,
    crawlData: any[],
    websiteUrl?: string
  ): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('create-university-table', {
      body: { universityId, universityName, crawlData, websiteUrl },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },
};
