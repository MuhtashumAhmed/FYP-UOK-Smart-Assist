import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { firecrawlApi } from '@/lib/api/firecrawl';
import { supabase } from '@/lib/supabase';
import { Loader2, Globe, Database, RefreshCw, ExternalLink, Trash2, Sparkles, Image, FileUp, Activity } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PdfUploadDialog } from '@/components/PdfUploadDialog';
import { RAGHealthPanel } from '@/components/RAGHealthPanel';

interface UniversityCrawl {
  id: string;
  university_id: string;
  university_name: string;
  table_name: string;
  last_crawl: string;
  status: string;
  pages_count: number;
  website_url?: string;
  logo_url?: string;
  extracted_info?: any;
  info_extracted_at?: string;
}

interface CrawlJob {
  crawlId: string;
  universityId: string;
  universityName: string;
  websiteUrl: string;
  status: string;
  completed: number;
  total: number;
}

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [url, setUrl] = useState('');
  const [universityName, setUniversityName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMappingUrls, setIsMappingUrls] = useState(false);
  const [mappedUrls, setMappedUrls] = useState<string[]>([]);
  const [crawledUniversities, setCrawledUniversities] = useState<UniversityCrawl[]>([]);
  const [activeCrawls, setActiveCrawls] = useState<CrawlJob[]>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(true);
  const [extractingInfo, setExtractingInfo] = useState<string | null>(null);
  const [fetchingLogo, setFetchingLogo] = useState<string | null>(null);
  const [pdfUploadOpen, setPdfUploadOpen] = useState(false);
  const [selectedUniversityForPdf, setSelectedUniversityForPdf] = useState<{ id: string; name: string } | null>(null);

  const handleOpenPdfUpload = (universityId: string, universityName: string) => {
    setSelectedUniversityForPdf({ id: universityId, name: universityName });
    setPdfUploadOpen(true);
  };

  const handleClosePdfUpload = () => {
    setPdfUploadOpen(false);
    setSelectedUniversityForPdf(null);
  };
  // Redirect non-admin users
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      toast({
        title: "Access Denied",
        description: "You must be an admin to access this page.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [user, isAdmin, loading, navigate, toast]);

  // Fetch crawled universities
  const fetchUniversities = async () => {
    try {
      const { data, error } = await supabase
        .from('university_crawls')
        .select('*')
        .order('last_crawl', { ascending: false });

      if (error) {
        console.error('Error fetching universities:', error);
      } else {
        setCrawledUniversities(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingUniversities(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUniversities();
    }
  }, [isAdmin]);

  // Poll active crawls
  useEffect(() => {
    if (activeCrawls.length === 0) return;

    const pollInterval = setInterval(async () => {
      const updatedCrawls: CrawlJob[] = [];
      
      for (const crawl of activeCrawls) {
        const result = await firecrawlApi.getCrawlStatus(crawl.crawlId);
        
        if (result.success) {
          if (result.status === 'completed') {
            // Store the data
            const storeResult = await firecrawlApi.storeUniversityData(
              crawl.universityId,
              crawl.universityName,
              result.data || [],
              crawl.websiteUrl
            );

            if (storeResult.success) {
              toast({
                title: "Crawl Complete",
                description: `Successfully crawled ${crawl.universityName}. ${result.data?.length || 0} pages stored.`,
              });
              
              // Auto-extract info and fetch logo
              handleExtractInfo(crawl.universityId, crawl.universityName);
              handleFetchLogo(crawl.universityId, crawl.websiteUrl);
              
              // Refresh university list
              fetchUniversities();
            } else {
              toast({
                title: "Storage Error",
                description: storeResult.error || 'Failed to store crawl data',
                variant: "destructive",
              });
            }
          } else {
            updatedCrawls.push({
              ...crawl,
              status: result.status || 'crawling',
              completed: result.completed || 0,
              total: result.total || 0,
            });
          }
        } else {
          toast({
            title: "Crawl Error",
            description: result.error || 'Failed to check crawl status',
            variant: "destructive",
          });
        }
      }
      
      setActiveCrawls(updatedCrawls);
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [activeCrawls, toast]);

  const handleMapUrls = async () => {
    if (!url) {
      toast({
        title: "Error",
        description: "Please enter a URL",
        variant: "destructive",
      });
      return;
    }

    setIsMappingUrls(true);
    setMappedUrls([]);

    try {
      const result = await firecrawlApi.map(url, { limit: 50 });
      
      if (result.success && result.links) {
        setMappedUrls(result.links);
        toast({
          title: "URLs Mapped",
          description: `Found ${result.links.length} URLs on this website`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to map URLs',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error mapping:', error);
      toast({
        title: "Error",
        description: "Failed to map URLs. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsMappingUrls(false);
    }
  };

  const handleStartCrawl = async () => {
    if (!url || !universityName) {
      toast({
        title: "Error",
        description: "Please enter both URL and university name",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const universityId = universityName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

      const result = await firecrawlApi.crawl(url, universityId, universityName, {
        limit: 50,
        maxDepth: 3,
      });

      if (result.success && result.crawlId) {
        toast({
          title: "Crawl Started",
          description: `Crawling ${universityName}. This may take a few minutes.`,
        });

        setActiveCrawls(prev => [...prev, {
          crawlId: result.crawlId!,
          universityId,
          universityName,
          websiteUrl: url,
          status: 'crawling',
          completed: 0,
          total: 0,
        }]);

        setUrl('');
        setUniversityName('');
        setMappedUrls([]);
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to start crawl',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error starting crawl:', error);
      toast({
        title: "Error",
        description: "Failed to start crawl. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractInfo = async (universityId: string, universityName: string) => {
    setExtractingInfo(universityId);
    
    try {
      const { data, error } = await supabase.functions.invoke('extract-university-info', {
        body: { universityId },
      });

      if (error) {
        console.error('Error extracting info:', error);
        toast({
          title: "Extraction Error",
          description: error.message || 'Failed to extract university info',
          variant: "destructive",
        });
      } else if (data?.success) {
        toast({
          title: "Info Extracted",
          description: `Successfully extracted info for ${universityName}`,
        });
        fetchUniversities();
      } else {
        toast({
          title: "Extraction Error",
          description: data?.error || 'Failed to extract university info',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to extract info. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setExtractingInfo(null);
    }
  };

  const handleFetchLogo = async (universityId: string, websiteUrl?: string) => {
    if (!websiteUrl) {
      // Try to get the website URL from the university record
      const uni = crawledUniversities.find(u => u.university_id === universityId);
      if (uni?.website_url) {
        websiteUrl = uni.website_url;
      } else {
        toast({
          title: "Error",
          description: "No website URL available for this university",
          variant: "destructive",
        });
        return;
      }
    }

    setFetchingLogo(universityId);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-university-logo', {
        body: { universityId, websiteUrl },
      });

      if (error) {
        console.error('Error fetching logo:', error);
        toast({
          title: "Logo Error",
          description: error.message || 'Failed to fetch university logo',
          variant: "destructive",
        });
      } else if (data?.success) {
        toast({
          title: "Logo Fetched",
          description: `Successfully fetched logo`,
        });
        fetchUniversities();
      } else {
        toast({
          title: "Logo Error",
          description: data?.error || 'Failed to fetch university logo',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch logo. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setFetchingLogo(null);
    }
  };

  const handleDeleteUniversity = async (universityId: string, universityName: string) => {
    if (!confirm(`Are you sure you want to delete all data for ${universityName}?`)) {
      return;
    }

    try {
      await supabase
        .from('university_pages')
        .delete()
        .eq('university_id', universityId);

      await supabase
        .from('university_crawls')
        .delete()
        .eq('university_id', universityId);

      toast({
        title: "Deleted",
        description: `Deleted all data for ${universityName}`,
      });

      setCrawledUniversities(prev => prev.filter(u => u.university_id !== universityId));
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: "Error",
        description: "Failed to delete university data",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Crawl university websites, extract info with AI, and manage data
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Crawl Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Crawl University Website
                </CardTitle>
                <CardDescription>
                  Enter a university website URL to crawl and store its data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="university-name">University Name</Label>
                  <Input
                    id="university-name"
                    placeholder="e.g., Harvard University"
                    value={universityName}
                    onChange={(e) => setUniversityName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://www.university.edu"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleMapUrls}
                    disabled={isMappingUrls || !url}
                  >
                    {isMappingUrls ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mapping...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Preview URLs
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleStartCrawl}
                    disabled={isLoading || !url || !universityName}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        Start Crawl
                      </>
                    )}
                  </Button>
                </div>

                {mappedUrls.length > 0 && (
                  <div className="mt-4">
                    <Label>Found URLs ({mappedUrls.length})</Label>
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-md border bg-muted/50 p-2">
                      {mappedUrls.slice(0, 20).map((mappedUrl, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground truncate py-0.5">
                          {mappedUrl}
                        </div>
                      ))}
                      {mappedUrls.length > 20 && (
                        <div className="text-xs text-muted-foreground mt-2">
                          ... and {mappedUrls.length - 20} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Crawls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5" />
                  Active Crawls
                </CardTitle>
                <CardDescription>
                  Currently running crawl jobs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeCrawls.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No active crawls</p>
                ) : (
                  <div className="space-y-3">
                    {activeCrawls.map((crawl) => (
                      <div
                        key={crawl.crawlId}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                      >
                        <div>
                          <p className="font-medium">{crawl.universityName}</p>
                          <p className="text-sm text-muted-foreground">
                            {crawl.completed} / {crawl.total || '?'} pages
                          </p>
                        </div>
                        <Badge variant="secondary" className="gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {crawl.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Crawled Universities Table */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Crawled Universities
              </CardTitle>
              <CardDescription>
                Universities with stored data - extract info with AI and fetch logos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUniversities ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : crawledUniversities.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No universities crawled yet. Start by crawling a website above.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>University</TableHead>
                      <TableHead>Pages</TableHead>
                      <TableHead>AI Info</TableHead>
                      <TableHead>Logo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crawledUniversities.map((uni) => (
                      <TableRow key={uni.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {uni.logo_url && (
                              <img 
                                src={uni.logo_url} 
                                alt="" 
                                className="w-6 h-6 rounded object-contain"
                              />
                            )}
                            {uni.university_name}
                          </div>
                        </TableCell>
                        <TableCell>{uni.pages_count}</TableCell>
                        <TableCell>
                          {uni.extracted_info ? (
                            <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/30">
                              ✓ Extracted
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {uni.logo_url ? (
                            <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/30">
                              ✓ Available
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Missing</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={uni.status === 'completed' ? 'default' : 'secondary'}
                          >
                            {uni.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExtractInfo(uni.university_id, uni.university_name)}
                              disabled={extractingInfo === uni.university_id}
                              title="Extract info with AI"
                            >
                              {extractingInfo === uni.university_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4 text-primary" />
                              )}
                            </Button>
                           
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenPdfUpload(uni.university_id, uni.university_name)}
                              title="Upload PDFs"
                            >
                              <FileUp className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUniversity(uni.university_id, uni.university_name)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* RAG Health Panel */}
          {crawledUniversities.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  RAG Health Dashboard
                </CardTitle>
                <CardDescription>
                  Monitor embedding status, chunk counts, and re-index data for each university
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {crawledUniversities.map((uni) => (
                    <RAGHealthPanel
                      key={uni.university_id}
                      universityId={uni.university_id}
                      universityName={uni.university_name}
                      onReindexComplete={fetchUniversities}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />

      {/* PDF Upload Dialog */}
      {selectedUniversityForPdf && (
        <PdfUploadDialog
          isOpen={pdfUploadOpen}
          onClose={handleClosePdfUpload}
          universityId={selectedUniversityForPdf.id}
          universityName={selectedUniversityForPdf.name}
          onUploadComplete={fetchUniversities}
        />
      )}
    </div>
  );
};

export default Admin;
