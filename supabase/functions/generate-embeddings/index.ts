import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple text chunking function
function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  
  return chunks.filter(chunk => chunk.trim().length > 50);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { universityId, regenerateAll = false } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch pages that need embeddings
    let query = supabase
      .from('university_pages')
      .select('id, university_id, title, markdown, url')
      .not('markdown', 'is', null);

    if (universityId) {
      query = query.eq('university_id', universityId);
    }

    if (!regenerateAll) {
      // Only get pages without embeddings
      query = query.is('has_embedding', null);
    }

    const { data: pages, error: pagesError } = await query.limit(50);

    if (pagesError) {
      throw new Error(`Failed to fetch pages: ${pagesError.message}`);
    }

    if (!pages || pages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pages need embedding', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${pages.length} pages for embeddings`);

    let processedCount = 0;
    let chunksCreated = 0;

    for (const page of pages) {
      try {
        const content = page.markdown || '';
        if (content.length < 50) continue;

        // Create chunks from the content
        const chunks = chunkText(content, 1500, 200);
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const chunkContent = `Title: ${page.title || 'Untitled'}\n\n${chunk}`;

          // Generate embedding using OpenAI
          const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: chunkContent.substring(0, 8000), // Limit input size
            }),
          });

          if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text();
            console.error(`Embedding API error: ${embeddingResponse.status} - ${errorText}`);
            continue;
          }

          const embeddingData = await embeddingResponse.json();
          const embedding = embeddingData.data?.[0]?.embedding;

          if (!embedding) {
            console.error('No embedding returned');
            continue;
          }

          // Store the chunk with its embedding
          const { error: insertError } = await supabase
            .from('university_chunks')
            .insert({
              university_id: page.university_id,
              page_id: page.id,
              content: chunkContent,
              embedding: embedding,
              chunk_index: i,
              metadata: {
                title: page.title,
                url: page.url,
                total_chunks: chunks.length,
              }
            });

          if (insertError) {
            console.error(`Failed to insert chunk: ${insertError.message}`);
          } else {
            chunksCreated++;
          }
        }

        // Mark page as having embeddings
        await supabase
          .from('university_pages')
          .update({ has_embedding: true })
          .eq('id', page.id);

        processedCount++;

        // Rate limiting - wait between pages
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (pageError) {
        console.error(`Error processing page ${page.id}:`, pageError);
      }
    }

    console.log(`Completed: ${processedCount} pages, ${chunksCreated} chunks created`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processedCount} pages, created ${chunksCreated} chunks`,
        processed: processedCount,
        chunks: chunksCreated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-embeddings:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
