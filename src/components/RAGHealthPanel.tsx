import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  FileText, 
  Globe, 
  Database, 
  Layers, 
  RefreshCw, 
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface RAGHealthStats {
  universityId: string;
  universityName: string;
  pdfPagesCount: number;
  webPagesCount: number;
  embeddedPagesCount: number;
  chunksCount: number;
  lastEmbeddingRun: string | null;
  totalPages: number;
  embeddingProgress: number;
}

interface RAGHealthPanelProps {
  universityId: string;
  universityName: string;
  onReindexComplete?: () => void;
}

export function RAGHealthPanel({ universityId, universityName, onReindexComplete }: RAGHealthPanelProps) {
  const [stats, setStats] = useState<RAGHealthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      // Fetch PDF pages count
      const { count: pdfCount } = await supabase
        .from('university_pages')
        .select('*', { count: 'exact', head: true })
        .eq('university_id', universityId)
        .eq('source_type', 'pdf');

      // Fetch web pages count
      const { count: webCount } = await supabase
        .from('university_pages')
        .select('*', { count: 'exact', head: true })
        .eq('university_id', universityId)
        .or('source_type.eq.crawl,source_type.is.null');

      // Fetch embedded pages count
      const { count: embeddedCount } = await supabase
        .from('university_pages')
        .select('*', { count: 'exact', head: true })
        .eq('university_id', universityId)
        .eq('has_embedding', true);

      // Fetch chunks count
      const { count: chunksCount } = await supabase
        .from('university_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('university_id', universityId);

      // Fetch total pages
      const { count: totalCount } = await supabase
        .from('university_pages')
        .select('*', { count: 'exact', head: true })
        .eq('university_id', universityId);

      // Fetch last embedding run (most recent page with embedding)
      const { data: lastEmbedded } = await supabase
        .from('university_pages')
        .select('crawled_at')
        .eq('university_id', universityId)
        .eq('has_embedding', true)
        .order('crawled_at', { ascending: false })
        .limit(1);

      const total = totalCount || 0;
      const embedded = embeddedCount || 0;

      setStats({
        universityId,
        universityName,
        pdfPagesCount: pdfCount || 0,
        webPagesCount: webCount || 0,
        embeddedPagesCount: embedded,
        chunksCount: chunksCount || 0,
        lastEmbeddingRun: lastEmbedded?.[0]?.crawled_at || null,
        totalPages: total,
        embeddingProgress: total > 0 ? Math.round((embedded / total) * 100) : 0,
      });
    } catch (err) {
      console.error('Error fetching RAG stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [universityId]);

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { universityId, regenerateAll: true },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Re-indexing Complete",
        description: `Processed ${data?.processed || 0} pages, created ${data?.chunks || 0} chunks`,
      });

      // Refresh stats
      await fetchStats();
      onReindexComplete?.();
    } catch (err) {
      console.error('Reindex error:', err);
      toast({
        title: "Re-index Failed",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setReindexing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  const isHealthy = stats.embeddingProgress >= 80;
  const hasIssues = stats.embeddingProgress < 50 && stats.totalPages > 0;

  return (
    <Card className="border-muted">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{universityName}</CardTitle>
            {isHealthy ? (
              <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Healthy
              </Badge>
            ) : hasIssues ? (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Needs Attention
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Clock className="w-3 h-3" />
                Pending
              </Badge>
            )}
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleReindex} 
            disabled={reindexing}
            className="gap-1"
          >
            {reindexing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Re-indexing...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                Re-index
              </>
            )}
          </Button>
        </div>
        <CardDescription>RAG data health and embedding status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <FileText className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-lg font-semibold">{stats.pdfPagesCount}</p>
              <p className="text-xs text-muted-foreground">PDF Pages</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Globe className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-lg font-semibold">{stats.webPagesCount}</p>
              <p className="text-xs text-muted-foreground">Web Pages</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Database className="w-4 h-4 text-purple-500" />
            <div>
              <p className="text-lg font-semibold">{stats.embeddedPagesCount}</p>
              <p className="text-xs text-muted-foreground">Embedded</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Layers className="w-4 h-4 text-orange-500" />
            <div>
              <p className="text-lg font-semibold">{stats.chunksCount}</p>
              <p className="text-xs text-muted-foreground">Chunks</p>
            </div>
          </div>
        </div>

        {/* Embedding Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Embedding Progress</span>
            <span className="font-medium">{stats.embeddingProgress}%</span>
          </div>
          <Progress value={stats.embeddingProgress} className="h-2" />
        </div>

        {/* Last Embedding Run */}
        {stats.lastEmbeddingRun && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            Last indexed: {new Date(stats.lastEmbeddingRun).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
