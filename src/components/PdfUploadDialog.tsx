import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Upload, FileText, Loader2, X, CheckCircle, Trash2 } from 'lucide-react';

interface UploadedPdf {
  id: string;
  title: string;
  url: string;
  crawled_at: string;
}

interface PdfUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  universityId: string;
  universityName: string;
  onUploadComplete?: () => void;
}

export const PdfUploadDialog = ({
  isOpen,
  onClose,
  universityId,
  universityName,
  onUploadComplete
}: PdfUploadDialogProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedPdfs, setUploadedPdfs] = useState<UploadedPdf[]>([]);
  const [loadingPdfs, setLoadingPdfs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch existing PDFs for this university
  const fetchExistingPdfs = async () => {
    setLoadingPdfs(true);
    try {
      const { data, error } = await supabase
        .from('university_pages')
        .select('id, title, url, crawled_at')
        .eq('university_id', universityId)
        .eq('source_type', 'pdf')
        .order('crawled_at', { ascending: false });

      if (error) {
        console.error('Error fetching PDFs:', error);
      } else {
        setUploadedPdfs(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingPdfs(false);
    }
  };

  // Fetch PDFs when dialog opens
  useEffect(() => {
    if (isOpen && universityId) {
      fetchExistingPdfs();
    }
  }, [isOpen, universityId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== selectedFiles.length) {
      toast({
        title: "Invalid files",
        description: "Only PDF files are allowed",
        variant: "destructive",
      });
    }
    
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files",
        description: "Please select PDF files to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('universityId', universityId);
        formData.append('universityName', universityName);

        const { data, error } = await supabase.functions.invoke('upload-university-pdf', {
          body: formData,
        });

        if (error) {
          const errAny = error as any;

          // supabase-js provides a helper to read the error response body for FunctionsHttpError
          let serverError: string | undefined;
          try {
            if (typeof errAny?.context?.json === 'function') {
              const body = await errAny.context.json();
              serverError = typeof body?.error === 'string' ? body.error : JSON.stringify(body);
            } else if (errAny?.context?.response) {
              const body = await errAny.context.response.clone().json();
              serverError = typeof body?.error === 'string' ? body.error : JSON.stringify(body);
            } else if (typeof errAny?.context?.body === 'string') {
              serverError = errAny.context.body;
            }
          } catch {
            // ignore parse failures
          }

          console.error('Upload error:', error);
          toast({
            title: "Upload Error",
            description: `Failed to upload ${file.name}: ${serverError || error.message}`,
            variant: "destructive",
          });
        } else if (data?.success) {
          toast({
            title: "Upload Complete",
            description: data.message,
          });
        }
      }

      setFiles([]);
      fetchExistingPdfs();
      onUploadComplete?.();
    } catch (error) {
      console.error('Error uploading:', error);
      toast({
        title: "Error",
        description: "Failed to upload PDFs",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePdf = async (pdfId: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;

    try {
      const { error } = await supabase
        .from('university_pages')
        .delete()
        .eq('id', pdfId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete PDF",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Deleted",
          description: `Removed "${title}"`,
        });
        fetchExistingPdfs();
        onUploadComplete?.();
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Upload PDFs for {universityName}
          </DialogTitle>
          <DialogDescription>
            Upload PDF documents specific to this university. The data will be stored
            and used by the AI chatbot when answering questions about {universityName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Upload Section */}
          <div className="space-y-4">
            <Label>Select PDF Files</Label>
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to select PDFs or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Only PDF files are accepted
              </p>
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({files.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-sm truncate max-w-[300px]">{file.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload {files.length} PDF{files.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Existing PDFs Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Uploaded PDFs</Label>
              {loadingPdfs && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>

            {uploadedPdfs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No PDFs uploaded yet for this university
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {uploadedPdfs.map((pdf) => (
                  <div
                    key={pdf.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/30 border"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium truncate max-w-[300px]">
                        {pdf.title}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {new Date(pdf.crawled_at).toLocaleDateString()}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePdf(pdf.id, pdf.title)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
