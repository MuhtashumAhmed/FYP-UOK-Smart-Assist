import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.3.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const universityId = formData.get('universityId') as string;
    const universityName = formData.get('universityName') as string;

    if (!file || !universityId || !universityName) {
      return new Response(
        JSON.stringify({ error: 'file, universityId, and universityName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing PDF upload for ${universityName} (${universityId}): ${file.name}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing required env vars', {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(supabaseKey),
      });
      return new Response(
        JSON.stringify({ error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload PDF to storage bucket (create bucket path per university)
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${universityId}/${Date.now()}_${safeFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('university-pdfs')
      .upload(storagePath, uint8Array, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Continue even if storage fails - we can still store extracted text
    }

    // Get public URL for the uploaded file
    let pdfUrl = '';
    if (uploadData) {
      const { data: urlData } = supabase.storage
        .from('university-pdfs')
        .getPublicUrl(storagePath);
      pdfUrl = urlData.publicUrl;
    }

    // Extract text content from PDF (best-effort, text-based PDFs only)
    // We'll store ONE row per page to improve retrieval (fees/program codes are often on a single page).
    type ExtractedPage = { pageNum: number; text: string };

    let extractedPages: ExtractedPage[] = [];
    let totalExtractedChars = 0;
    let isScannedPdf = false;

    try {
      // pdfjs-serverless works in Deno without a worker.
      const loadingTask = getDocument({
        data: uint8Array,
        useSystemFonts: true,
      } as any);

      const pdf = await (loadingTask as any).promise;
      const maxPages = Math.min(pdf.numPages ?? 0, 50);

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = (textContent.items || [])
          .map((it: any) => (it?.str ? String(it.str) : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (pageText) {
          const cleaned = pageText
            .replace(/\u0000/g, '')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
            .trim();

          extractedPages.push({ pageNum, text: cleaned });
          totalExtractedChars += cleaned.length;
        }

        // Keep within a safe limit for DB + embeddings.
        if (totalExtractedChars > 250_000) break;
      }

      // Detect if this is a scanned PDF (little or no selectable text)
      if (totalExtractedChars < 200 || extractedPages.length === 0) {
        isScannedPdf = true;
        console.log('[PDF] Detected scanned/image PDF, attempting OCR...');
        
        // Try OCR using  AI (Gemini)
        try {
          const pdfBase64 = arrayBufferToBase64(arrayBuffer);
          
          // Only send first 10MB for OCR (base64 encoded)
          const maxBase64Size = 10 * 1024 * 1024;
          const truncatedBase64 = pdfBase64.length > maxBase64Size 
            ? pdfBase64.substring(0, maxBase64Size) 
            : pdfBase64;
          
          const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('ocr-pdf', {
            body: { 
              pdfBase64: truncatedBase64, 
              fileName: file.name,
              universityId,
              universityName,
            },
          });

          if (ocrError) {
            console.error('[OCR] Error:', ocrError);
          } else if (ocrResult?.success && ocrResult?.text && ocrResult.text.length > 50) {
            console.log(`[OCR] Successfully extracted ${ocrResult.charCount} characters`);
            extractedPages = [{
              pageNum: 1,
              text: ocrResult.text,
            }];
            totalExtractedChars = ocrResult.charCount;
            isScannedPdf = false; // We got text now
          } else {
            console.log('[OCR] No meaningful text extracted from OCR');
          }
        } catch (ocrErr) {
          console.error('[OCR] Exception:', ocrErr);
        }
      }

      // If still no text after OCR attempt, create a placeholder
      if (totalExtractedChars < 200 || extractedPages.length === 0) {
        extractedPages = [{
          pageNum: 1,
          text: `PDF Document: ${file.name}\n\nThis PDF was uploaded for ${universityName}. (Text extraction found little/no selectable text; OCR was attempted but may have failed. It could be a low-quality scanned PDF.)`,
        }];
      }
    } catch (e) {
      console.log('PDF text extraction error:', e);
      extractedPages = [{
        pageNum: 1,
        text: `PDF Document: ${file.name}\n\nThis PDF was uploaded for ${universityName}. (Text extraction failed.)`,
      }];
    }

    // Store in university_pages table with source_type = 'pdf' (one row per page)
    const baseTitle = file.name.replace(/\.pdf$/i, '').replace(/_/g, ' ');

    const pagesToInsert = extractedPages.map((p) => ({
      university_id: universityId,
      url: pdfUrl ? `${pdfUrl}#page=${p.pageNum}` : `pdf://${file.name}#page=${p.pageNum}`,
      title: extractedPages.length > 1 ? `${baseTitle} (Page ${p.pageNum})` : baseTitle,
      markdown: p.text.slice(0, 120_000),
      source_type: 'pdf',
      pdf_storage_path: storagePath,
      crawled_at: new Date().toISOString(),
      has_embedding: null,
      metadata: { pdf_file_name: file.name, page: p.pageNum },
    }));

    const { data: pageRows, error: pageError } = await supabase
      .from('university_pages')
      .insert(pagesToInsert)
      .select('id');

    if (pageError) {
      console.error('Database insert error:', pageError);
      return new Response(
        JSON.stringify({ error: 'Failed to store PDF data: ' + pageError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update pages count in university_crawls
    const { data: countData } = await supabase
      .from('university_pages')
      .select('id', { count: 'exact' })
      .eq('university_id', universityId);

    await supabase
      .from('university_crawls')
      .update({ pages_count: countData?.length || 0 })
      .eq('university_id', universityId);

    console.log(`Successfully stored PDF for ${universityName}: ${file.name}`);

    // Automatically generate embeddings for this PDF in the background
    // We use EdgeRuntime.waitUntil to not block the response
    const generateEmbeddings = async () => {
      try {
        const firstText = extractedPages?.[0]?.text || '';
        const isPlaceholder = /found little\/no selectable text|Text extraction failed/i.test(firstText);
        const hasEnoughText = (totalExtractedChars || 0) >= 400;

        if (isPlaceholder || !hasEnoughText) {
          console.log('[Background] Skipping embeddings (scanned/image PDF or extraction too small)');
          return;
        }

        console.log(`[Background] Invoking generate-embeddings for university ${universityId}`);
        const { data, error } = await supabase.functions.invoke('generate-embeddings', {
          body: { universityId, regenerateAll: false },
        });

        if (error) {
          console.error('[Background] generate-embeddings invoke error:', error);
          return;
        }

        console.log('[Background] generate-embeddings invoked successfully:', data);
      } catch (e) {
        console.error('[Background] Embedding generation error:', e);
      }
    };

    // Start background task using globalThis.EdgeRuntime (Supabase Edge)
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof globalThis.EdgeRuntime !== 'undefined') {
      // @ts-ignore
      globalThis.EdgeRuntime.waitUntil(generateEmbeddings());
    } else {
      // Fallback: just fire and forget (don't await)
      generateEmbeddings();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `PDF "${file.name}" uploaded successfully for ${universityName}. Embeddings are being generated in the background.`,
        pageIds: (pageRows || []).map((r: any) => r.id),
        pdfUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in upload-university-pdf:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
