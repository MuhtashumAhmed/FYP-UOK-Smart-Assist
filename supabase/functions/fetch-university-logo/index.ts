const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { universityId, websiteUrl } = await req.json();

    if (!universityId || !websiteUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'University ID and website URL are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      // Return 200 so the frontend can handle this gracefully without throwing FunctionsHttpError
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = websiteUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Fetching branding for:', formattedUrl);

    // Use Firecrawl's scrape with branding format to get logo
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['branding'],
        onlyMainContent: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      // Return 200 so the frontend can show a toast without throwing a FunctionsHttpError
      return new Response(
        JSON.stringify({ success: false, error: data.error || 'Failed to fetch branding' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract logo from branding data
    const branding = data.data?.branding || data.branding;
    const logoUrl = branding?.images?.logo || branding?.logo || null;
    const favicon = branding?.images?.favicon || null;
    const colors = branding?.colors || null;

    console.log('Branding data:', { logoUrl, favicon, colors });

    // Update the university_crawls table with logo
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from('university_crawls')
      .update({
        logo_url: logoUrl || favicon,
        brand_colors: colors
      })
      .eq('university_id', universityId);

    if (updateError) {
      console.error('Error updating university logo:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save logo' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully fetched and saved logo for:', universityId);

    return new Response(
      JSON.stringify({
        success: true,
        logoUrl: logoUrl || favicon,
        branding,
        message: 'Logo fetched successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    // Return 200 so the caller can display the error without the invoke() call throwing
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
