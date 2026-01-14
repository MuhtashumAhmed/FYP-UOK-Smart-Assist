import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is admin
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { universityId, universityName, crawlData, websiteUrl } = await req.json();

    if (!universityId || !universityName) {
      return new Response(
        JSON.stringify({ success: false, error: 'University ID and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a sanitized table name from university name
    const tableName = `uni_${universityId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    console.log('Creating/updating table:', tableName, 'for university:', universityName);

    // First check if table exists in university_crawls
    const { data: existingUni, error: checkError } = await supabase
      .from('university_crawls')
      .select('id')
      .eq('university_id', universityId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking university:', checkError);
    }

    // Insert or update the university crawl record
    const { data: uniData, error: uniError } = await supabase
      .from('university_crawls')
      .upsert({
        university_id: universityId,
        university_name: universityName,
        table_name: tableName,
        last_crawl: new Date().toISOString(),
        status: 'completed',
        pages_count: crawlData?.length || 0,
        website_url: websiteUrl || null
      }, { onConflict: 'university_id' })
      .select()
      .single();

    if (uniError) {
      console.error('Error upserting university record:', uniError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create university record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store crawl data in the university_pages table
    // IMPORTANT: do NOT delete PDFs that admins uploaded (source_type = 'pdf')
    if (crawlData && crawlData.length > 0) {
      // Find existing WEB pages for this university (source_type NULL or 'web')
      const { data: existingWebPages, error: existingWebPagesError } = await supabase
        .from('university_pages')
        .select('id')
        .eq('university_id', universityId)
        .or('source_type.is.null,source_type.eq.web');

      if (existingWebPagesError) {
        console.error('Error fetching existing web pages:', existingWebPagesError);
      }

      const webPageIds = (existingWebPages || []).map((p: any) => p.id).filter(Boolean);

      // Delete old embeddings/chunks for web pages we are replacing
      if (webPageIds.length > 0) {
        const { error: deleteChunksError } = await supabase
          .from('university_chunks')
          .delete()
          .in('page_id', webPageIds);

        if (deleteChunksError) {
          console.error('Error deleting old chunks for web pages:', deleteChunksError);
        }

        // Delete existing WEB pages for this university (keep PDFs)
        const { error: deletePagesError } = await supabase
          .from('university_pages')
          .delete()
          .in('id', webPageIds);

        if (deletePagesError) {
          console.error('Error deleting old web pages:', deletePagesError);
        }
      }

      // Insert new pages
      const pages = crawlData.map((page: any) => ({
        university_id: universityId,
        url: page.metadata?.sourceURL || page.url || '',
        title: page.metadata?.title || 'Untitled',
        markdown: page.markdown || '',
        html: page.html || '',
        metadata: page.metadata || {},
        source_type: 'web',
        crawled_at: new Date().toISOString(),
        has_embedding: null,
      }));

      const { error: pagesError } = await supabase
        .from('university_pages')
        .insert(pages);

      if (pagesError) {
        console.error('Error inserting pages:', pagesError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to store crawl data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Kick off embedding generation for new/updated web pages in the background
      const generateEmbeddings = async () => {
        try {
          console.log('Starting background embeddings generation for:', universityId);
          const { data: embedData, error: embedError } = await supabase.functions.invoke('generate-embeddings', {
            body: { universityId, regenerateAll: false },
          });
          if (embedError) {
            console.error('Background embedding generation failed:', embedError);
          } else {
            console.log('Background embedding generation result:', embedData);
          }
        } catch (e) {
          console.error('Background embedding generation exception:', e);
        }
      };

      // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
      if (typeof globalThis.EdgeRuntime !== 'undefined') {
        // @ts-ignore
        globalThis.EdgeRuntime.waitUntil(generateEmbeddings());
      } else {
        generateEmbeddings();
      }
    }

    console.log('Successfully stored data for:', universityName);

    return new Response(
      JSON.stringify({
        success: true,
        tableName,
        universityId,
        pagesStored: crawlData?.length || 0,
        message: `Data stored for ${universityName}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
